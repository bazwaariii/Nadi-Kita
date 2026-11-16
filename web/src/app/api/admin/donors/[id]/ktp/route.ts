import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const donor = await db.donorProfile.findUnique({
    where: { id },
    select: {
      fullName: true,
      ktpFileName: true,
      ktpFileData: true,
    },
  });

  if (!donor || !donor.ktpFileData) {
    return NextResponse.json(
      {
        error: {
          code: "KTP_NOT_FOUND",
          message: "Dokumen PDF KTP belum diunggah oleh pendonor ini.",
        },
      },
      { status: 404 }
    );
  }

  const base64Part = donor.ktpFileData.replace(
    /^data:application\/pdf;base64,/,
    ""
  );
  const pdfBuffer = Buffer.from(base64Part, "base64");
  const filename = donor.ktpFileName || `ktp-${id}.pdf`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}

