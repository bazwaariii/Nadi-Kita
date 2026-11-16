import { NextResponse } from "next/server";
import { BLOOD_GROUP_META, type BloodGroupCode } from "@/lib/format-tanggal";
import { getSessionUser } from "@/server/auth";
import { db } from "@/server/db";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ user: null, data: null });
  }

  let ktpVerified = false;
  let bloodGroup: string | null = null;
  let bloodGroupDisplay: string | null = null;
  let activeTicketId: string | null = null;

  if (session.donorId) {
    const [donor, activeBooking] = await Promise.all([
      db.donorProfile.findUnique({
        where: { id: session.donorId },
        select: { ktpVerified: true, bloodGroup: true },
      }),
      db.booking.findFirst({
        where: {
          donorId: session.donorId,
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
        },
        select: { id: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    if (donor) {
      ktpVerified = donor.ktpVerified;
      bloodGroup = donor.bloodGroup;
      bloodGroupDisplay =
        BLOOD_GROUP_META[donor.bloodGroup as BloodGroupCode]?.display ||
        donor.bloodGroup;
    }
    if (activeBooking) {
      activeTicketId = activeBooking.id;
    }
  }

  const userPayload = {
    id: session.userId,
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
    donorId: session.donorId ?? null,
    ktpVerified,
    bloodGroup,
    bloodGroupDisplay,
    activeTicketId,
  };

  return NextResponse.json({
    user: userPayload,
    data: userPayload,
  });
}
