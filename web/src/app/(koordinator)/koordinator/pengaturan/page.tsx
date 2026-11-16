import { db } from "@/server/db";
import { env } from "@/server/env";
import { DEFAULT_ELIGIBILITY_CONFIG } from "@/server/rules/eligibility";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function CoordinatorSettingsPage() {
  const [branch, admins] = await Promise.all([
    db.branch.findUnique({ where: { id: env.DEFAULT_BRANCH_ID } }),
    db.user.findMany({
      where: { role: { in: ["COORDINATOR", "ADMIN"] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const rules = (branch?.rules || DEFAULT_ELIGIBILITY_CONFIG) as {
    cooldownDays?: number;
    minWeightKg?: number;
    age?: { min?: number; max?: number };
    slot?: { capacity?: number };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] leading-tight font-bold text-ink">
            Pengaturan cabang UTD dan akun petugas
          </h1>
          <p className="mt-1 max-w-[70ch] text-[15px] text-ink-soft">
            Kelola parameter operasional UTD, batas usia serta masa jeda donor,
            dan tambahkan akun petugas admin atau koordinator baru.
          </p>
        </div>
      </div>

      <SettingsClient
        initialBranch={{
          name: branch?.name || "UTD PMI Kota Surabaya",
          city: branch?.city || "Surabaya",
          cooldownDays: rules.cooldownDays ?? 60,
          minWeightKg: rules.minWeightKg ?? 45,
          minAge: rules.age?.min ?? 17,
          maxAge: rules.age?.max ?? 60,
          defaultSlotCapacity: rules.slot?.capacity ?? 4,
        }}
        initialAdmins={admins}
      />
    </div>
  );
}
