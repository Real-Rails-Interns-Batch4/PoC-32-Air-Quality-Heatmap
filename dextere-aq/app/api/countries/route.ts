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

export async function GET() {
  try {
    const res = await fetch(`${OPENAQ_BASE}/countries?limit=200`, {
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
    console.error("OpenAQ countries fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch countries" },
      { status: 500 }
    );
  }
}
