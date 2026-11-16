import { NextResponse } from "next/server";
import { db, getDbType } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbType = getDbType();
  try {
    const branchCount = await db.branch.count();
    const userCount = await db.user.count();
    return NextResponse.json({
      ok: true,
      dbType,
      branchCount,
      userCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const name = err instanceof Error ? err.name : "Error";
    return NextResponse.json(
      {
        ok: false,
        dbType,
        errorName: name,
        errorHint: message.slice(0, 200),
      },
      { status: 503 }
    );
  }
}
