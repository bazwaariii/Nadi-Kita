import { db } from "@/server/db";

export interface TaskMetricRow {
  taskCode: string;
  taskLabel: string;
  roleLabel: string;
  targetSeconds: number | null;
  n: number;
  medianSeconds: number;
  q1Seconds: number;
  q3Seconds: number;
  completionRatePct: number;
  durationsSeconds: number[];
}

export interface PilotMetricsSummary {
  medianInviteSeconds: number;
  medianBookingSeconds: number;
  susScoreMedian: number;
  susRespondents: number;
  tasks: TaskMetricRow[];
  bookingTimeDistribution: {
    bucket: string;
    count: number;
    pct: number;
  }[];
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return Math.round(sorted[base] + rest * (sorted[base + 1] - sorted[base]));
  }
  return Math.round(sorted[base]);
}

/**
 * Mengagregasi metrik uji coba relawan dari tabel EventLog sesuai planning.md Bagian 16 & design.md Bagian 7.8
 */
export async function getPilotMetricsSummary(): Promise<PilotMetricsSummary> {
  const events = await db.eventLog.findMany({
    orderBy: { at: "asc" },
  });

  const taskDefs = [
    {
      taskCode: "T1",
      taskLabel: "Buat dan kirim permintaan donor B+",
      roleLabel: "Koordinator",
      eventName: "task_t1_completed",
      targetSeconds: 120,
    },
    {
      taskCode: "T2",
      taskLabel: "Dari undangan sampai punya tiket",
      roleLabel: "Donor",
      eventName: "task_t2_completed",
      targetSeconds: 180,
    },
    {
      taskCode: "T3",
      taskLabel: "Check-in dan konfirmasi hasil",
      roleLabel: "Koordinator + donor",
      eventName: "task_t3_completed",
      targetSeconds: 90,
    },
    {
      taskCode: "T4",
      taskLabel: "Batalkan jadwal",
      roleLabel: "Donor",
      eventName: "task_t4_completed",
      targetSeconds: 60,
    },
  ];

  const tasks: TaskMetricRow[] = taskDefs.map((def) => {
    const matching = events.filter((e) => e.name === def.eventName);
    const durations: number[] = [];
    let completedCount = 0;

    for (const ev of matching) {
      const meta = (ev.meta || {}) as {
        durationSeconds?: number;
        completed?: boolean;
      };
      if (typeof meta.durationSeconds === "number" && meta.durationSeconds > 0) {
        durations.push(Math.round(meta.durationSeconds));
      }
      if (meta.completed !== false) {
        completedCount += 1;
      }
    }

    durations.sort((a, b) => a - b);
    const n = matching.length;
    const completionRatePct =
      n > 0 ? Math.round((completedCount / n) * 100) : 100;

    return {
      taskCode: def.taskCode,
      taskLabel: def.taskLabel,
      roleLabel: def.roleLabel,
      targetSeconds: def.targetSeconds,
      n,
      medianSeconds: quantile(durations, 0.5),
      q1Seconds: quantile(durations, 0.25),
      q3Seconds: quantile(durations, 0.75),
      completionRatePct,
      durationsSeconds: durations,
    };
  });

  const susEvents = events.filter((e) => e.name === "sus_submitted");
  const susScores = susEvents
    .map((e) => Number(((e.meta || {}) as { score?: number }).score || 0))
    .filter((n) => n > 0)
    .sort((a, b) => a - b);

  const t1Row = tasks.find((t) => t.taskCode === "T1")!;
  const t2Row = tasks.find((t) => t.taskCode === "T2")!;

  const t2Durations = t2Row.durationsSeconds;
  const totalT2 = Math.max(1, t2Durations.length);
  const buckets = [
    {
      bucket: "Di bawah 90 dtk",
      count: t2Durations.filter((d) => d < 90).length,
    },
    {
      bucket: "90–119 dtk",
      count: t2Durations.filter((d) => d >= 90 && d < 120).length,
    },
    {
      bucket: "120–149 dtk",
      count: t2Durations.filter((d) => d >= 120 && d < 150).length,
    },
    {
      bucket: "150–179 dtk",
      count: t2Durations.filter((d) => d >= 150 && d < 180).length,
    },
    {
      bucket: "180 dtk atau lebih",
      count: t2Durations.filter((d) => d >= 180).length,
    },
  ].map((b) => ({
    ...b,
    pct: Math.round((b.count / totalT2) * 100),
  }));

  return {
    medianInviteSeconds: t1Row.medianSeconds,
    medianBookingSeconds: t2Row.medianSeconds,
    susScoreMedian: quantile(susScores, 0.5),
    susRespondents: susScores.length,
    tasks,
    bookingTimeDistribution: buckets,
  };
}

