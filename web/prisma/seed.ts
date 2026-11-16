import fs from "fs";
import path from "path";
import { BloodGroup, PrismaClient, Sex } from "@prisma/client";
import { deriveInvitationToken } from "../src/lib/tokens";
import { hashPassword } from "../src/server/auth";
import { env } from "../src/server/env";
import { DEFAULT_ELIGIBILITY_CONFIG } from "../src/server/rules/eligibility";

const prisma = new PrismaClient();

function createSampleKtpPdfDataUri(fullName: string, bloodGroup: string, birthDate: string): {
  fileName: string;
  fileSize: number;
  dataUri: string;
} {
  const safeName = fullName.replace(/[()\\]/g, "");
  const streamContent = [
    "BT",
    "/F1 16 Tf",
    "50 740 Td",
    "(DOKUMEN IDENTITAS PENDONor - KTP) Tj",
    "/F1 12 Tf",
    "0 -30 Td",
    `(Nama Lengkap : ${safeName}) Tj`,
    "0 -20 Td",
    `(Tanggal Lahir : ${birthDate}) Tj`,
    "0 -20 Td",
    `(Golongan Darah : ${bloodGroup}) Tj`,
    "0 -20 Td",
    "(Status Dokumen : Terunggah via Nadi Kita) Tj",
    "ET",
  ].join("\n");

  const pdfLines = [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${streamContent.length} >> stream\n${streamContent}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "xref",
    "0 6",
    "0000000000 65535 f ",
    "trailer << /Size 6 /Root 1 0 R >>",
    "%%EOF",
  ].join("\n");

  const buf = Buffer.from(pdfLines, "utf8");
  const slug = safeName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    fileName: `ktp-${slug}.pdf`,
    fileSize: buf.byteLength,
    dataUri: `data:application/pdf;base64,${buf.toString("base64")}`,
  };
}

interface SeedDonorRecord {
  code: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  sex: "M" | "F";
  bloodGroup: BloodGroup;
  cohort: string | null;
  contactConsent: boolean;
  firstDonationAt: string | null;
  lastDonationAt: string | null;
  donationCount: number;
  nextEligibleAt: string | null;
  isSynthetic: boolean;
}

interface SyntheticSeedPayload {
  seed: number;
  referenceDate: string;
  branch: {
    name: string;
    city: string;
    isSimulated: boolean;
  };
  initialStock: {
    group: BloodGroup;
    units: number;
    criticalAt: number;
    safeAt: number;
  }[];
  donors: SeedDonorRecord[];
  volunteers: SeedDonorRecord[];
}

export async function runSeed(baseNow: Date = new Date()) {
  const seedFilePath = path.resolve(
    __dirname,
    "../../ml/artifacts/synthetic_seed.json"
  );
  if (!fs.existsSync(seedFilePath)) {
    throw new Error(
      `File seed sintetis tidak ditemukan di ${seedFilePath}. Jalankan generator Python terlebih dahulu.`
    );
  }

  const payload = JSON.parse(
    fs.readFileSync(seedFilePath, "utf8")
  ) as SyntheticSeedPayload;

  const refDate = new Date(payload.referenceDate);
  const shiftMs = baseNow.getTime() - refDate.getTime();
  const shiftDate = (iso: string | null): Date | null => {
    if (!iso) return null;
    return new Date(new Date(iso).getTime() + shiftMs);
  };

  // Bersihkan tabel dengan urutan aman relasi
  await prisma.eventLog.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.donation.deleteMany({});
  await prisma.screening.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.invitation.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.slot.deleteMany({});
  await prisma.stockLevel.deleteMany({});
  await prisma.donorProfile.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.modelVersion.deleteMany({});
  await prisma.branch.deleteMany({});

  const branchId = env.DEFAULT_BRANCH_ID;
  await prisma.branch.create({
    data: {
      id: branchId,
      name: "UTD PMI Kota Surabaya",
      city: "Surabaya",
      isSimulated: false,
      rules: JSON.parse(JSON.stringify(DEFAULT_ELIGIBILITY_CONFIG)),
    },
  });

  // ModelVersion dari ml/artifacts/metrics.json
  const metricsPath = path.resolve(
    __dirname,
    "../../ml/artifacts/metrics.json"
  );
  if (fs.existsSync(metricsPath)) {
    const metricsJson = JSON.parse(fs.readFileSync(metricsPath, "utf8"));
    await prisma.modelVersion.create({
      data: {
        id: metricsJson.modelVersion || "return-lr-v1",
        trainedAt: new Date(metricsJson.trainedAt || baseNow),
        metrics: metricsJson,
        artifactUri: "ml/artifacts/model.joblib",
        isActive: true,
      },
    });
  }

  // Stok awal 8 golongan darah (planning.md Bagian 9.2)
  const stockUpdatedTime = new Date(baseNow.getTime() - 3 * 60 * 1000);
  for (const item of payload.initialStock) {
    await prisma.stockLevel.create({
      data: {
        branchId,
        group: item.group,
        units: item.units,
        criticalAt: item.criticalAt,
        safeAt: item.safeAt,
        updatedAt: stockUpdatedTime,
        updatedBy: "usr_coord_01",
      },
    });
  }

  const defaultPwdHash = hashPassword("nadikita2026");

  // 1 Admin + 2 Koordinator
  await prisma.user.createMany({
    data: [
      {
        id: "usr_admin_01",
        email: "admin@nadikita.test",
        name: "Admin Sistem Nadi Kita",
        passwordHash: defaultPwdHash,
        role: "ADMIN",
        branchId,
      },
      {
        id: "usr_coord_01",
        email: "ratna.koordinator@nadikita.test",
        name: "Bu Ratna (Koordinator UTD)",
        passwordHash: defaultPwdHash,
        role: "COORDINATOR",
        branchId,
      },
      {
        id: "usr_coord_02",
        email: "eko.petugas@nadikita.test",
        name: "Pak Eko (Petugas Antrean)",
        passwordHash: defaultPwdHash,
        role: "COORDINATOR",
        branchId,
      },
    ],
  });

  // 15 Akun Relawan (cohort "pilot-2026")
  for (const vol of payload.volunteers) {
    const userId = `usr_${vol.code}`;
    await prisma.user.create({
      data: {
        id: userId,
        email: vol.email,
        name: vol.fullName,
        passwordHash: defaultPwdHash,
        role: "DONOR",
        branchId,
      },
    });

    const firstAt = shiftDate(vol.firstDonationAt);
    const lastAt = shiftDate(vol.lastDonationAt);
    const nextAt = shiftDate(vol.nextEligibleAt);
    const samplePdf = createSampleKtpPdfDataUri(
      vol.fullName,
      vol.bloodGroup,
      vol.birthDate
    );

    await prisma.donorProfile.create({
      data: {
        id: vol.code,
        userId,
        fullName: vol.fullName,
        email: vol.email,
        phone: vol.phone,
        birthDate: new Date(vol.birthDate),
        sex: vol.sex as Sex,
        bloodGroup: vol.bloodGroup,
        cohort: vol.cohort,
        contactConsent: vol.contactConsent,
        consentAt: firstAt || baseNow,
        firstDonationAt: firstAt,
        lastDonationAt: lastAt,
        donationCount: vol.donationCount,
        nextEligibleAt: nextAt,
        ktpFileName: samplePdf.fileName,
        ktpFileSize: samplePdf.fileSize,
        ktpFileData: samplePdf.dataUri,
        ktpVerified: vol.code !== "vol_03" && vol.code !== "vol_06",
        ktpUploadedAt: firstAt || baseNow,
        isSynthetic: true,
      },
    });

    if (lastAt) {
      await prisma.donation.create({
        data: {
          donorId: vol.code,
          branchId,
          donatedAt: lastAt,
          volumeMl: 350,
          source: "SEED",
        },
      });
    }
  }

  // 320 Profil Donor Sintetis
  const donorDataBatch = payload.donors.map((d) => ({
    id: d.code,
    userId: null,
    fullName: d.fullName,
    email: d.email,
    phone: d.phone,
    birthDate: new Date(d.birthDate),
    sex: d.sex as Sex,
    bloodGroup: d.bloodGroup,
    cohort: d.cohort,
    contactConsent: d.contactConsent,
    consentAt: d.contactConsent ? baseNow : null,
    firstDonationAt: shiftDate(d.firstDonationAt),
    lastDonationAt: shiftDate(d.lastDonationAt),
    donationCount: d.donationCount,
    nextEligibleAt: shiftDate(d.nextEligibleAt),
    isSynthetic: true,
  }));

  for (const row of donorDataBatch) {
    await prisma.donorProfile.create({ data: row });
  }

  // Buat Slot 7 hari ke depan (08.00 sampai 14.30 WIB, tiap 30 menit, kapasitas 4)
  // Pastikan slot hari ini berada di masa depan relatif terhadap baseNow agar bisa dipesan & dipindai
  const slotHoursWIB = [
    [8, 0],
    [8, 30],
    [9, 0],
    [9, 30],
    [10, 0],
    [10, 30],
    [11, 0],
    [11, 30],
    [13, 0],
    [13, 30],
    [14, 0],
    [14, 30],
  ];

  const createdSlots: { id: string; startsAt: Date; endsAt: Date }[] = [];

  // Slot aktif segera (mulai 10 menit dari sekarang untuk demo check-in langsung)
  const immediateStart = new Date(
    Math.ceil(baseNow.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000)
  );
  const immediateEnd = new Date(immediateStart.getTime() + 30 * 60 * 1000);
  const slotNow = await prisma.slot.create({
    data: {
      id: "slot_demo_now",
      branchId,
      startsAt: immediateStart,
      endsAt: immediateEnd,
      capacity: 4,
      bookedCount: 2,
    },
  });
  createdSlots.push(slotNow);

  const slotNext = await prisma.slot.create({
    data: {
      id: "slot_demo_next",
      branchId,
      startsAt: new Date(immediateStart.getTime() + 180 * 60 * 1000),
      endsAt: new Date(immediateStart.getTime() + 210 * 60 * 1000),
      capacity: 4,
      bookedCount: 2,
    },
  });
  createdSlots.push(slotNext);

  for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
    const dayDate = new Date(
      baseNow.getTime() + dayOffset * 24 * 60 * 60 * 1000
    );
    const yyyy = dayDate.getUTCFullYear();
    const mm = dayDate.getUTCMonth();
    const dd = dayDate.getUTCDate();

    for (const [hhWib, minWib] of slotHoursWIB) {
      // WIB = UTC+7 -> UTC hour = hhWib - 7
      const startUtc = new Date(Date.UTC(yyyy, mm, dd, hhWib - 7, minWib, 0));
      const endUtc = new Date(startUtc.getTime() + 30 * 60 * 1000);
      const preBooked = (dayOffset + hhWib + minWib) % 3; // 0, 1, atau 2 terisi

      const s = await prisma.slot.create({
        data: {
          branchId,
          startsAt: startUtc,
          endsAt: endUtc,
          capacity: 4,
          bookedCount: preBooked,
        },
      });
      createdSlots.push(s);
    }
  }

  // Buat 1 Permintaan Donor aktif (B+, target 8 kantong, batas 5 hari lagi) sesuai wireframe 7.2
  const campaignDeadline = new Date(
    baseNow.getTime() + 5 * 24 * 60 * 60 * 1000
  );
  const demoCampaign = await prisma.campaign.create({
    data: {
      id: "cmp_demo_bpos",
      branchId,
      group: "B_POS",
      targetUnits: 8,
      deadlineAt: campaignDeadline,
      status: "ACTIVE",
      cohortFilter: "pilot-2026",
      overInviteFactor: 1.5,
      modelVersion: "return-lr-v1",
      createdById: "usr_coord_01",
      sentAt: new Date(baseNow.getTime() - 45 * 60 * 1000),
    },
  });

  // Buat undangan untuk relawan pilot-2026 agar halaman /donor, /u/[token], dan /koordinator langsung hidup
  for (let i = 0; i < payload.volunteers.length; i++) {
    const vol = payload.volunteers[i];
    const invId = `inv_demo_${i + 1}`;
    const { tokenHash } = deriveInvitationToken(invId, env.AUTH_SECRET);
    const status =
      i === 0
        ? "OPENED"
        : i >= 1 && i <= 4
          ? "BOOKED"
          : "SENT";

    await prisma.invitation.create({
      data: {
        id: invId,
        campaignId: demoCampaign.id,
        donorId: vol.code,
        tokenHash,
        status,
        score: Number((0.54 - i * 0.015).toFixed(2)),
        rank: i + 1,
        reasons: [
          {
            feature: "frequency",
            text: `Donor rutin (${vol.donationCount} kali)`,
            impact: 0.18,
          },
          {
            feature: "recency",
            text: "Terakhir donor 4 bulan lalu",
            impact: 0.08,
          },
        ],
        channel: "EMAIL",
        sentAt: new Date(baseNow.getTime() - 40 * 60 * 1000),
        openedAt:
          status !== "SENT"
            ? new Date(baseNow.getTime() - 25 * 60 * 1000)
            : null,
        expiresAt: new Date(baseNow.getTime() + 48 * 3600 * 1000),
      },
    });
  }

  // Buat jadwal antrean hari ini pada slot_demo_now dan slot_demo_next sesuai wireframe 7.4
  await prisma.booking.create({
    data: {
      id: "bkg_demo_01",
      slotId: slotNow.id,
      donorId: "vol_03", // Dimas Saputra
      invitationId: "inv_demo_3",
      code: "7H3K9Q2M",
      status: "CHECKED_IN",
      checkedInAt: new Date(baseNow.getTime() - 8 * 60 * 1000),
    },
  });

  await prisma.booking.create({
    data: {
      id: "bkg_demo_02",
      slotId: slotNow.id,
      donorId: "vol_02", // Sari Wijaya
      invitationId: "inv_demo_2",
      code: "4P8R2W6N",
      status: "CONFIRMED",
    },
  });

  await prisma.booking.create({
    data: {
      id: "bkg_demo_03",
      slotId: slotNext.id,
      donorId: "vol_04", // Nadia Kusuma
      invitationId: "inv_demo_4",
      code: "9M2T5K8V",
      status: "CONFIRMED",
    },
  });

  await prisma.booking.create({
    data: {
      id: "bkg_demo_04",
      slotId: slotNext.id,
      donorId: "vol_05", // Fajar Hidayat
      invitationId: "inv_demo_5",
      code: "3C7G4J9X",
      status: "CONFIRMED",
    },
  });

  // Isi EventLog hasil simulasi uji coba 15 relawan (T1, T2, T3, T4, dan SUS) sesuai Bagian 16 & 7.8
  const t1Durations = [68, 74, 82, 89, 95, 104];
  for (let i = 0; i < t1Durations.length; i++) {
    await prisma.eventLog.create({
      data: {
        name: "task_t1_completed",
        actorId: "usr_coord_01",
        role: "COORDINATOR",
        entityId: demoCampaign.id,
        meta: { durationSeconds: t1Durations[i], completed: true },
      },
    });
  }

  const t2Durations = [
    78, 84, 92, 98, 105, 112, 118, 124, 131, 136, 142, 148, 156, 165, 174,
  ];
  for (let i = 0; i < t2Durations.length; i++) {
    await prisma.eventLog.create({
      data: {
        name: "task_t2_completed",
        actorId: `vol_${String(i + 1).padStart(2, "0")}`,
        role: "DONOR",
        meta: { durationSeconds: t2Durations[i], completed: true },
      },
    });
  }

  const t3Durations = [28, 32, 35, 39, 41, 44, 48, 52, 55, 61];
  for (let i = 0; i < t3Durations.length; i++) {
    await prisma.eventLog.create({
      data: {
        name: "task_t3_completed",
        actorId: "usr_coord_01",
        role: "COORDINATOR",
        meta: { durationSeconds: t3Durations[i], completed: true },
      },
    });
  }

  const t4Durations = [22, 26, 29, 34, 38, 42, 47, 51];
  for (let i = 0; i < t4Durations.length; i++) {
    await prisma.eventLog.create({
      data: {
        name: "task_t4_completed",
        actorId: `vol_${String(i + 1).padStart(2, "0")}`,
        role: "DONOR",
        meta: { durationSeconds: t4Durations[i], completed: true },
      },
    });
  }

  const susScores = [
    77.5, 80.0, 82.5, 82.5, 85.0, 85.0, 85.0, 87.5, 87.5, 90.0, 90.0, 90.0,
    92.5, 92.5, 95.0,
  ];
  for (let i = 0; i < susScores.length; i++) {
    await prisma.eventLog.create({
      data: {
        name: "sus_submitted",
        actorId: `vol_${String(i + 1).padStart(2, "0")}`,
        role: "DONOR",
        meta: { score: susScores[i] },
      },
    });
  }

  // Pastikan indeks unik parsial tetap aktif
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_booking_per_donor
    ON "Booking" ("donorId") WHERE status IN ('CONFIRMED', 'CHECKED_IN');
  `);

  const rizkyToken = deriveInvitationToken("inv_demo_1", env.AUTH_SECRET).rawToken;
  console.log(
    `[db:seed] Selesai! 320 donor sintetis + 15 relawan + 8 stok + slot 7 hari. Token demo Rizky: /u/${rizkyToken}`
  );
}

if (require.main === module) {
  runSeed()
    .catch((err) => {
      console.error("[db:seed] Gagal:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

