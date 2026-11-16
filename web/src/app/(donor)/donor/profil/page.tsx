import { redirect } from "next/navigation";
import {
  BLOOD_GROUP_META,
  BLOOD_GROUP_ORDER,
} from "@/lib/format-tanggal";
import { DonorNavigation } from "@/components/ui/Navigation";
import { getSessionUser } from "@/server/auth";
import { db } from "@/server/db";
import { DonorProfileForm } from "./DonorProfileForm";

export const dynamic = "force-dynamic";

export default async function DonorProfilePage() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/masuk");
  }
  if (session.role === "ADMIN" || session.role === "COORDINATOR") {
    redirect("/koordinator");
  }

  const donor = session.donorId
    ? await db.donorProfile.findUnique({ where: { id: session.donorId } })
    : null;

  return (
    <div className="min-h-screen bg-canvas pb-24 md:pb-10">
      <DonorNavigation />

      <main
        id="konten-utama"
        className="mx-auto max-w-[680px] px-4 py-6 sm:py-8"
      >
        <h1 className="text-[28px] leading-tight font-bold text-ink">
          Profil & dokumen KTP pendonor
        </h1>
        <p className="mt-1 text-base text-ink-soft">
          Perbarui identitas, golongan darah, dokumen PDF KTP, atau izin
          dihubungi oleh UTD. Setiap perubahan dicatat di log audit UTD.
        </p>

        {donor && (
          <DonorProfileForm
            donor={{
              id: donor.id,
              fullName: donor.fullName,
              email: donor.email || "",
              phone: donor.phone || "",
              bloodGroup: donor.bloodGroup,
              birthDate: donor.birthDate.toISOString().split("T")[0],
              lastDonationAt: donor.lastDonationAt
                ? donor.lastDonationAt.toISOString().split("T")[0]
                : "",
              cityArea: donor.cohort || "Surabaya",
              weightKg: 62,
              contactConsent: donor.contactConsent,
              ktpFileName: donor.ktpFileName || null,
              ktpFileSize: donor.ktpFileSize || null,
              ktpVerified: donor.ktpVerified,
              hasKtpFile: Boolean(donor.ktpFileData),
            }}
            bloodGroupOptions={BLOOD_GROUP_ORDER.map((c) => ({
              code: c,
              label: `${BLOOD_GROUP_META[c].display} (${BLOOD_GROUP_META[c].spoken})`,
            }))}
          />
        )}
      </main>
    </div>
  );
}
