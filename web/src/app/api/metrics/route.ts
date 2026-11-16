import { NextResponse } from "next/server";
import { getPilotMetricsSummary } from "@/server/services/metrics";

export async function GET() {
  const summary = await getPilotMetricsSummary();
  return NextResponse.json(summary);
}

