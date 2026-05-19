import { NextResponse } from "next/server";

const OPENAQ_BASE = "https://api.openaq.org/v3";

function getHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "DEXTERE-AQ-Terminal/1.0",
  };
  const key = process.env.OPENAQ_API_KEY;
  if (key) headers["X-API-Key"] = key;
  return headers;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");

  if (!locationId) {
    return NextResponse.json({ error: "locationId required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${OPENAQ_BASE}/locations/${locationId}/latest`, {
      headers: getHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenAQ responded with ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("OpenAQ latest fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch latest data" },
      { status: 500 }
    );
  }
}
