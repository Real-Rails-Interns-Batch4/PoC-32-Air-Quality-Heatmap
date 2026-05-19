import { NextResponse } from "next/server";

const OPENAQ_BASE = "https://api.openaq.org/v3";

function getHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "DEXTERE-AQ-Terminal/1.0",
  };
  const key = process.env.OPENAQ_API_KEY;
  if (key) {
    headers["X-API-Key"] = key;
  }
  return headers;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const limit = searchParams.get("limit") || "100";
  const page = searchParams.get("page") || "1";
  const country = searchParams.get("country") || "";
  const coordinates = searchParams.get("coordinates") || "";
  const radius = searchParams.get("radius") || "100000";

  // Build query string cleanly using URLSearchParams
  const queryParams = new URLSearchParams({
    limit: limit,
    page: page,
  });

  // ALERT: OpenAQ v3 expects a numerical ID for countries (e.g., country=9 for India), 
  // NOT ISO strings like "IN" or "US". If your frontend sends "IN", it triggers a 404/422.
  if (country) {
    queryParams.append("countries_id", country);
  }

  if (coordinates && radius) {
    queryParams.append("coordinates", coordinates);
    queryParams.append("radius", radius);
  }

  const url = `${OPENAQ_BASE}/locations?${queryParams.toString()}`;

  try {
    const res = await fetch(url, {
      headers: getHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[OpenAQ Error] Status: ${res.status} | Details:`, body);
      
      return NextResponse.json(
        { error: `OpenAQ responded with status ${res.status}`, detail: body },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("OpenAQ locations fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch from OpenAQ" },
      { status: 500 }
    );
  }
}