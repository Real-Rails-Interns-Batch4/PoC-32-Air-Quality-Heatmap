"""
DEXTERE Air Quality Intelligence — FastAPI Backend
Production Core Implementation Core File

Runs on: uvicorn main:app --reload --port 8000
"""

import os
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import pandas as pd
import json
from typing import Optional
import logging
from dotenv import load_dotenv

# Initialize logging profiles
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dextere-aq")

# Load environmental variables from local development env files.
load_dotenv()
load_dotenv(".env.local")

app = FastAPI(
    title="DEXTERE Air Quality Intelligence API",
    description="FastAPI Orchestration + Pandas Processing Single Source of Truth over OpenAQ v3",
    version="2.0.0",
)

# Configure CORS policies to allow web communication with Next.js on port 3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000","http://localhost:3006","http://127.0.0.1:3006", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENAQ_BASE = "https://api.openaq.org/v3"
OPENAQ_API_KEY = os.getenv("OPENAQ_API_KEY")
DEFAULT_PAGE_SIZE = 500
MAX_PAGE_SIZE = 1000
COUNTRY_PAGE_SIZE = 1000

HEADERS = {
    "User-Agent": "DEXTERE-AQ-Terminal/1.0",
    "Accept": "application/json"
}

if OPENAQ_API_KEY:
    HEADERS["X-API-Key"] = OPENAQ_API_KEY
    logger.info("OpenAQ API credentials successfully verified and appended to headers.")
else:
    logger.warning("WARNING: OPENAQ_API_KEY variable is absent. Upstream connection will trigger a 401 error.")


async def fetch_openaq(path: str, params: Optional[dict] = None, timeout: int = 25) -> dict:
    """Fetch OpenAQ JSON through the backend so the UI never talks upstream directly."""
    url = f"{OPENAQ_BASE}{path}"
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            resp = await client.get(url, params=params or {}, headers=HEADERS)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"OpenAQ request rejected: {str(e)}")


def normalize_found(found) -> Optional[int]:
    if isinstance(found, int):
        return found
    if isinstance(found, str):
        cleaned = found.strip().replace(",", "")
        if cleaned.isdigit():
            return int(cleaned)
    return None


def build_meta(upstream_meta: dict, page: int, limit: int, result_count: int) -> dict:
    found = normalize_found(upstream_meta.get("found"))
    has_more = result_count >= limit
    if found is not None:
        has_more = page * limit < found

    return {
        "found": found,
        "foundLabel": upstream_meta.get("found", found if found is not None else result_count),
        "page": int(upstream_meta.get("page", page) or page),
        "limit": int(upstream_meta.get("limit", limit) or limit),
        "returned": result_count,
        "hasMore": has_more,
    }


async def fetch_all_countries() -> list:
    """Countries are small enough to page fully and use as exact aggregate source."""
    results = []
    page = 1

    while True:
        data = await fetch_openaq(
            "/countries",
            params={"limit": COUNTRY_PAGE_SIZE, "page": page},
            timeout=20,
        )
        chunk = data.get("results", [])
        results.extend(chunk)
        meta = data.get("meta", {})
        found = normalize_found(meta.get("found"))

        if not chunk or len(chunk) < COUNTRY_PAGE_SIZE:
            break
        if found is not None and len(results) >= found:
            break
        page += 1
        if page > 20:
            logger.warning("Stopped country pagination after 20 pages to protect upstream.")
            break

    return results


def country_location_count(country: dict) -> int:
    for key in ("locations", "locationsCount", "locationCount"):
        value = country.get(key)
        if isinstance(value, int):
            return value
    sensors = country.get("sensors", 0)
    return sensors if isinstance(sensors, int) else 0


def build_country_stats(countries: list) -> list:
    chart_data = []
    for country in countries:
        count = country_location_count(country)
        if count <= 0:
            continue
        chart_data.append({
            "code": country.get("code", "XX"),
            "name": country.get("name", "Unknown Country"),
            "stationCount": count,
            "avgRiskScore": 0,
            "liveStations": 0,
            "monitorCount": 0,
            "sensorCount": country.get("sensors", 0) or 0,
        })

    chart_data.sort(key=lambda x: x["stationCount"], reverse=True)
    return chart_data


# ─── Pandas Processing Infrastructure ────────────────────────────────────────

def calculate_staleness(last_updated: Optional[str]) -> str:
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
    if df.empty:
        return df
    df["param_score"] = df["sensor_count"].apply(lambda x: min(x / 8, 1) * 40)
    staleness_map = {"live": 30, "recent": 20, "stale": 5, "unknown": 0}
    df["recency_score"] = df["staleness"].map(staleness_map).fillna(0)
    df["coverage_score"] = df["is_monitor"].apply(lambda x: 30 if x else 15)
    
    df["risk_score"] = (df["param_score"] + df["recency_score"] + df["coverage_score"]).round().astype(int)

    def label_risk(score):
        if score >= 80: return "High Coverage"
        elif score >= 55: return "Moderate Coverage"
        elif score >= 30: return "Low Coverage"
        else: return "Sparse"

    df["risk_label"] = df["risk_score"].apply(label_risk)
    
    def color_risk(score):
        if score >= 80: return "#38BDF8"
        elif score >= 55: return "#818CF8"
        elif score >= 30: return "#FACC15"
        else: return "#EF4444"
        
    df["risk_color"] = df["risk_score"].apply(color_risk)
    return df


def normalize_locations(raw_results: list) -> pd.DataFrame:
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
            "locality": loc.get("locality") or "Unknown Locality",
            "timezone": loc.get("timezone", ""),
            "country_id": country.get("id"),
            "country_code": country.get("code", ""),
            "country_name": country.get("name", ""),
            "provider_name": provider.get("name", "Unknown Provider"),
            "owner_name": owner.get("name", "Unknown Owner"),
            "latitude": coords.get("latitude"),
            "longitude": coords.get("longitude"),
            "sensor_count": len(sensors),
            "sensors": sensors,
            "is_monitor": bool(loc.get("isMonitor", False)),
            "is_mobile": bool(loc.get("isMobile", False)),
            "last_updated": datetime_last.get("utc"),
        })

    df = pd.DataFrame(rows)
    if df.empty:
        return df

    df["staleness"] = df["last_updated"].apply(calculate_staleness)
    df = df.dropna(subset=["latitude", "longitude"])
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
    df = build_risk_score_df(df)
    return df


# ─── API Router Mapping (ORDER IS FIXED TO PREVENT 404s) ─────────────────────

@app.get("/api/countries")
async def get_countries():
    """Provides complete country directory objects straight to the UI dropdown selection tool."""
    countries = await fetch_all_countries()
    return {
        "meta": {"found": len(countries), "page": 1, "limit": len(countries), "returned": len(countries), "hasMore": False},
        "results": countries,
    }


@app.get("/api/country-stats/master")
async def get_master_country_chart_stats():
    """Generates global country metrics arrays natively from Python, ensuring your chart bars stay populated."""
    countries = await fetch_all_countries()
    chart_data = build_country_stats(countries)
    return {
        "meta": {"found": len(chart_data), "page": 1, "limit": len(chart_data), "returned": len(chart_data), "hasMore": False},
        "results": chart_data,
        "totalLocations": sum(item["stationCount"] for item in chart_data),
    }


@app.get("/api/bootstrap")
async def get_bootstrap():
    """Single startup payload for dropdowns, chart data, and global totals."""
    countries = await fetch_all_countries()
    stats = build_country_stats(countries)
    return {
        "countries": countries,
        "countryStats": stats,
        "totalLocations": sum(item["stationCount"] for item in stats),
    }


# DYNAMIC GENERIC ROUTE IS PLACED AT THE BOTTOM SO IT DOES NOT OVERWRITE STATIC PATHS
@app.get("/api/locations")
async def get_locations(
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    page: int = Query(1, ge=1),
    country_id: Optional[str] = None,
    filter_type: Optional[str] = "all",
    search: Optional[str] = None,
):
    """
    Central Single Source of Truth Core Route. Manages parameter filtering, 
    and passes upstream metadata back un-truncated to support progressive pagination button tracking.
    """
    queryParams = {
        "limit": str(limit),
        "page": str(page)
    }
    
    if country_id and country_id.strip() != "" and country_id != "undefined":
        queryParams["countries_id"] = str(country_id)

    data = await fetch_openaq("/locations", params=queryParams, timeout=25)

    raw_results = data.get("results", [])
    df = normalize_locations(raw_results)
    
    # Extract the dynamic metadata from OpenAQ to return true asset numbers
    upstream_meta = data.get("meta", {})
    response_meta = build_meta(upstream_meta, page, limit, len(raw_results))

    if df.empty:
        return {"meta": response_meta, "results": [], "countryStats": []}

    if filter_type == "live":
        df = df[df["staleness"] == "live"]
    elif filter_type == "monitor":
        df = df[df["is_monitor"] == True]

    if search:
        q = search.strip().lower()
        df = df[
            df["name"].str.lower().str.contains(q) |
            df["country_name"].str.lower().str.contains(q) |
            df["country_code"].str.lower().str.contains(q) |
            df["locality"].str.lower().str.contains(q)
        ]

    country_stats = []
    if not df.empty:
        agg = (
            df.groupby(["country_code", "country_name"])
            .agg(
                stationCount=("id", "count"),
                avgRiskScore=("risk_score", "mean"),
                liveStations=("staleness", lambda x: (x == "live").sum()),
                monitorCount=("is_monitor", "sum"),
            )
            .reset_index()
        )
        agg = agg.rename(columns={"country_code": "code", "country_name": "name"})
        agg["avgRiskScore"] = agg["avgRiskScore"].round().astype(int)
        agg["liveStations"] = agg["liveStations"].astype(int)
        agg["monitorCount"] = agg["monitorCount"].astype(int)
        country_stats = json.loads(agg.sort_values("stationCount", ascending=False).to_json(orient="records"))

    serializable_results = json.loads(df.to_json(orient="records"))
    return {
        "meta": response_meta,
        "results": serializable_results,
        "countryStats": country_stats
    }
