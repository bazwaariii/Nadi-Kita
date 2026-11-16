import {
  BLOOD_GROUP_META,
  type BloodGroupCode,
  formatDateWIB,
} from "@/lib/format-tanggal";
import { db } from "@/server/db";
import { calculateAgeYears } from "@/server/rules/eligibility";
import {
  type AdminDonorRow,
  DonorVerificationClient,
} from "./DonorVerificationClient";

export const dynamic = "force-dynamic";

export default async function CoordinatorDonorsPage() {
  const donors = await db.donorProfile.findMany({
    orderBy: [{ ktpVerified: "asc" }, { createdAt: "desc" }],
  });

  const now = new Date();
  const rows: AdminDonorRow[] = donors.map((d) => {
    const ageYears = calculateAgeYears(d.birthDate, now);
    const isCooldown =
      d.nextEligibleAt && d.nextEligibleAt.getTime() > now.getTime();
    const daysRemaining = isCooldown
      ? Math.max(
          1,
          Math.ceil(
            (d.nextEligibleAt!.getTime() - now.getTime()) /
              (24 * 60 * 60 * 1000)
          )
        )
      : 0;
    const eligibleNow =
      !isCooldown && ageYears >= 17 && ageYears <= 60 && d.contactConsent;

    const bgCode = d.bloodGroup as BloodGroupCode;

    return {
      id: d.id,
      fullName: d.fullName,
      email: d.email || "-",
      phone: d.phone || "",
      bloodGroup: d.bloodGroup,
      bloodGroupDisplay: BLOOD_GROUP_META[bgCode]?.display || d.bloodGroup,
      sex: d.sex,
      ageYears,
      cityArea: d.cohort || "Surabaya",
      weightKg: 62,
      eligibleNow,
      daysRemaining,
      lastDonationFormatted: d.lastDonationAt
        ? formatDateWIB(d.lastDonationAt)
        : "Belum pernah",
      ktpFileName: d.ktpFileName || null,
      ktpFileSize: d.ktpFileSize || null,
      ktpVerified: d.ktpVerified,
      hasKtpFile: Boolean(d.ktpFileData),
      historicalDonations: d.donationCount,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] leading-tight font-bold text-ink">
            Daftar pendonor dan verifikasi KTP
          </h1>
          <p className="mt-1 max-w-[70ch] text-[15px] text-ink-soft">
            Periksa dokumen PDF KTP yang diunggah saat registrasi, pantau status
            masa jeda 60 hari, dan kelola persetujuan identitas pendonor.
          </p>
        </div>
      </div>

      <DonorVerificationClient initialDonors={rows} />
    </div>
  );
}
