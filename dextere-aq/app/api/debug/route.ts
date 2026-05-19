import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.OPENAQ_API_KEY;
  return NextResponse.json({
    hasKey: !!key,
    keyLength: key?.length ?? 0,
    keyPreview: key ? `${key.slice(0, 6)}...${key.slice(-4)}` : "NOT FOUND",
  });
}
