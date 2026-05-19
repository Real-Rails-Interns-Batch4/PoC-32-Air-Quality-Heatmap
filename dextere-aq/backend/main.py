"""
DEXTERE Air Quality Intelligence — FastAPI Backend
Phase 2: Data Ingestion + Logic Layer (Claude Protocol)

Runs on: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import httpx
import pandas as pd
import numpy as np
import io
import json
from datetime import datetime, timezone
from typing import Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dextere-aq")

app = FastAPI(
    title="DEXTERE Air Quality Intelligence API",
    description="FastAPI + Pandas orchestration layer over OpenAQ v3",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENAQ_BASE = "https://api.openaq.org/v3"
HEADERS = {"User-Agent": "DEXTERE-AQ-Terminal/1.0", "Accept": "application/json"}


# ─── Pandas Risk Score Pipeline ─────────────────────────────────────────────

def calculate_staleness(last_updated: Optional[str]) -> str:
    """Classify data freshness into live/recent/stale."""
    if not last_updated:
        return "unknown"
    try:
        dt = pd.to_datetime(last_updated, utc=True)
        diff_hours = (pd.Timestamp.now(tz="UTC") - dt).total_seconds() / 3600
        if diff_hours < 1:
            return "live"
        elif diff_hours < 24:
            return "recent"
        else:
            return "stale"
    except Exception:
        return "unknown"


def build_risk_score_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    Core logic layer: Calculate composite risk/coverage scores.
    
    Score Composition:
      - Parameter Diversity (40%): sensor count vs. max 8 params
      - Data Recency (30%): live=30, recent=20, stale=5
      - Monitor Quality (30%): reference monitor=30, low-cost=15
    """
    # Sensor count score
    df["param_score"] = df["sensor_count"].apply(lambda x: min(x / 8, 1) * 40)

    # Staleness score
    staleness_map = {"live": 30, "recent": 20, "stale": 5, "unknown": 0}
    df["recency_score"] = df["staleness"].map(staleness_map).fillna(0)

    # Monitor quality score
    df["coverage_score"] = df["is_monitor"].apply(lambda x: 30 if x else 15)

    # Composite
    df["risk_score"] = (
        df["param_score"] + df["recency_score"] + df["coverage_score"]
    ).round().astype(int)

    # Risk label
    def label(score):
        if score >= 80:
            return "High Coverage"
        elif score >= 55:
            return "Moderate Coverage"
        elif score >= 30:
            return "Low Coverage"
        else:
            return "Sparse"

    df["risk_label"] = df["risk_score"].apply(label)
    return df


def normalize_locations(raw_results: list) -> pd.DataFrame:
    """Flatten OpenAQ v3 locations JSON → normalized Pandas DataFrame."""
    rows = []
    for loc in raw_results:
        coords = loc.get("coordinates") or {}
        country = loc.get("country") or {}
        provider = loc.get("provider") or {}
        owner = loc.get("owner") or {}
        sensors = loc.get("sensors") or []
        datetime_last = loc.get("datetimeLast") or {}

        rows.append({
            "id": loc.get("id"),
            "name": loc.get("name", ""),
            "locality": loc.get("locality"),
            "timezone": loc.get("timezone", ""),
            "country_code": country.get("code", ""),
            "country_name": country.get("name", ""),
            "provider": provider.get("name", ""),
            "owner": owner.get("name", ""),
            "latitude": coords.get("latitude"),
            "longitude": coords.get("longitude"),
            "sensor_count": len(sensors),
            "parameters": [s["parameter"]["name"] for s in sensors if s.get("parameter")],
            "is_monitor": bool(loc.get("isMonitor", False)),
            "is_mobile": bool(loc.get("isMobile", False)),
            "last_updated": datetime_last.get("utc"),
        })

    df = pd.DataFrame(rows)
    if df.empty:
        return df

    # Staleness classification
    df["staleness"] = df["last_updated"].apply(calculate_staleness)

    # Drop invalid coordinates
    df = df.dropna(subset=["latitude", "longitude"])
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")

    # Risk scoring
    df = build_risk_score_df(df)

    return df


def compute_country_aggregates(df: pd.DataFrame) -> pd.DataFrame:
    """Country-level aggregations — Pandas groupby pipeline."""
    if df.empty:
        return pd.DataFrame()

    agg = (
        df.groupby(["country_code", "country_name"])
        .agg(
            station_count=("id", "count"),
            avg_risk_score=("risk_score", "mean"),
            live_stations=("staleness", lambda x: (x == "live").sum()),
            monitor_count=("is_monitor", "sum"),
        )
        .reset_index()
    )
    agg["avg_risk_score"] = agg["avg_risk_score"].round(1)
    return agg.sort_values("station_count", ascending=False)


def aqi_from_pm25(pm25: float) -> dict:
    """US EPA AQI linear interpolation for PM2.5."""
    breakpoints = [
        (0, 12, 0, 50, "Good"),
        (12.1, 35.4, 51, 100, "Moderate"),
        (35.5, 55.4, 101, 150, "Unhealthy for Sensitive Groups"),
        (55.5, 150.4, 151, 200, "Unhealthy"),
        (150.5, 250.4, 201, 300, "Very Unhealthy"),
        (250.5, 500, 301, 500, "Hazardous"),
    ]
    for bp_lo, bp_hi, i_lo, i_hi, label in breakpoints:
        if bp_lo <= pm25 <= bp_hi:
            aqi = round(((i_hi - i_lo) / (bp_hi - bp_lo)) * (pm25 - bp_lo) + i_lo)
            return {"aqi": min(aqi, 500), "label": label}
    return {"aqi": 500, "label": "Hazardous"}


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "DEXTERE AQ Intelligence API", "ts": datetime.now(timezone.utc).isoformat()}


@app.get("/api/locations")
async def get_locations(
    limit: int = Query(100, ge=1, le=1000),
    page: int = Query(1, ge=1),
    country: Optional[str] = None,
    coordinates: Optional[str] = None,
    radius: int = Query(100000, ge=1000),
):
    """
    Proxy + enrich OpenAQ locations with DEXTERE risk scoring.
    Returns normalized JSON ready for the Next.js frontend.
    """
    url = f"{OPENAQ_BASE}/locations?limit={limit}&page={page}&sort=desc&order_by=lastUpdated"
    if country:
        url += f"&country={country}"
    if coordinates:
        url += f"&coordinates={coordinates}&radius={radius}"

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(url, headers=HEADERS)
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail="OpenAQ error")
        except Exception as e:
            raise HTTPException(status_code=503, detail=str(e))

    raw = data.get("results", [])
    df = normalize_locations(raw)

    if df.empty:
        return {"meta": data.get("meta", {}), "results": [], "enriched": True}

    # Convert back to JSON-serializable list
    results = json.loads(df.to_json(orient="records"))

    return {
        "meta": data.get("meta", {}),
        "results": results,
        "enriched": True,
        "pipeline": "pandas-v2-dextere-risk-score",
    }


@app.get("/api/country-stats")
async def get_country_stats(
    limit: int = Query(200, ge=10, le=1000),
):
    """Country-level aggregation pipeline using Pandas groupby."""
    url = f"{OPENAQ_BASE}/locations?limit={limit}&sort=desc&order_by=lastUpdated"

    async with httpx.AsyncClient(timeout=20) as client:
        try:
            resp = await client.get(url, headers=HEADERS)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            raise HTTPException(status_code=503, detail=str(e))

    df = normalize_locations(data.get("results", []))
    if df.empty:
        return {"results": []}

    agg_df = compute_country_aggregates(df)
    return {"results": json.loads(agg_df.to_json(orient="records"))}


@app.get("/api/export/csv")
async def export_csv(
    limit: int = Query(500, ge=1, le=2000),
    country: Optional[str] = None,
):
    """
    Phase 3 Export: Stream enriched CSV with risk scores.
    Maps to the 'Download Sample Data' button in the UI.
    """
    url = f"{OPENAQ_BASE}/locations?limit={limit}&sort=desc&order_by=lastUpdated"
    if country:
        url += f"&country={country}"

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.get(url, headers=HEADERS)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            raise HTTPException(status_code=503, detail=str(e))

    df = normalize_locations(data.get("results", []))
    if df.empty:
        raise HTTPException(status_code=404, detail="No data found")

    # Select export columns
    export_cols = [
        "id", "name", "country_code", "country_name",
        "latitude", "longitude", "locality",
        "sensor_count", "parameters", "is_monitor", "is_mobile",
        "staleness", "risk_score", "risk_label", "last_updated",
    ]
    export_df = df[[c for c in export_cols if c in df.columns]].copy()
    export_df["parameters"] = export_df["parameters"].apply(
        lambda x: "|".join(x) if isinstance(x, list) else ""
    )

    buf = io.StringIO()
    export_df.to_csv(buf, index=False)
    buf.seek(0)

    filename = f"dextere-aq-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.get("/api/aqi-score")
def compute_aqi(pm25: float = Query(..., ge=0, le=1000)):
    """Calculate US EPA AQI from a PM2.5 value."""
    return aqi_from_pm25(pm25)


@app.get("/api/latest/{location_id}")
async def get_latest(location_id: int):
    """Fetch latest sensor readings for a specific location."""
    url = f"{OPENAQ_BASE}/locations/{location_id}/latest"
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(url, headers=HEADERS)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=503, detail=str(e))
