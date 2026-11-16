import { BloodGroup } from "@prisma/client";
import { BloodGroupCode, formatShortDateWIB } from "@/lib/format-tanggal";
import { deriveInvitationToken } from "@/lib/tokens";
import { db, parseBranchRules } from "@/server/db";
import { env } from "@/server/env";
import {
  DonorCandidateInput,
  evaluateDonorInvitationEligibility,
} from "@/server/rules/eligibility";
import {
  buildCampaignWarnings,
  CampaignWarning,
  computePriorityWithFatigue,
  formatCandidateSummaryReason,
  RankedDonorCandidate,
  selectInviteCountK,
} from "@/server/rules/ranking";
import { buildInvitationLinks } from "@/server/services/email";
import { scoreDonorsWithMlOrFallback } from "@/server/services/ml-client";

export interface ExcludedCooldownDonor {
  id: string;
  fullName: string;
  bloodGroup: string;
  lastDonationAt: string;
  nextEligibleAt: string;
  daysRemaining: number;
  reasonText: string;
}

export interface CampaignPreviewResult {
  branchId: string;
  branchName: string;
  group: BloodGroupCode;
  targetUnits: number;
  deadlineAt: string;
  modelVersion: string;
  usedFallback: boolean;
  eligibleCount: number;
  selectedK: number;
  expectedUnits: number;
  requiredExpected: number;
  availableSlotCapacity: number;
  candidates: RankedDonorCandidate[];
  cooldownExcludedCount: number;
  cooldownExcludedDonors: ExcludedCooldownDonor[];
  otherExcludedCount: number;
  warnings: CampaignWarning[];
}

export async function generateCampaignPreview(
  params: {
    branchId?: string;
    group: BloodGroupCode;
    targetUnits: number;
    deadlineAt: Date;
    cohortFilter?: string | null;
    customInviteCount?: number | null;
  },
  options?: {
    now?: Date;
    forceFallback?: boolean;
    mlServiceUrlOverride?: string;
  }
): Promise<CampaignPreviewResult> {
  const now = options?.now || new Date();
  const branchId = params.branchId || env.DEFAULT_BRANCH_ID;

  const branch = await db.branch.findUnique({ where: { id: branchId } });
  const config = parseBranchRules(branch?.rules);

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const donors = await db.donorProfile.findMany({
    where: {
      bloodGroup: params.group as BloodGroup,
      ...(params.cohortFilter ? { cohort: params.cohortFilter } : {}),
    },
    include: {
      bookings: {
        where: { status: { in: ["CONFIRMED", "CHECKED_IN"] } },
        select: { id: true },
      },
      invitations: {
        where: { sentAt: { gte: thirtyDaysAgo } },
        select: { id: true },
      },
    },
  });

  const eligibleInputs: DonorCandidateInput[] = [];
  const cooldownExcludedDonors: ExcludedCooldownDonor[] = [];
  let otherExcludedCount = 0;

  for (const d of donors) {
    const candidateInput: DonorCandidateInput = {
      id: d.id,
      fullName: d.fullName,
      bloodGroup: d.bloodGroup,
      birthDate: d.birthDate,
      contactConsent: d.contactConsent,
      cohort: d.cohort,
      lastDonationAt: d.lastDonationAt,
      firstDonationAt: d.firstDonationAt,
      donationCount: d.donationCount,
      hasActiveBooking: d.bookings.length > 0,
      invitesLast30d: d.invitations.length,
    };

    const evalRes = evaluateDonorInvitationEligibility(
      candidateInput,
      {
        targetGroup: params.group,
        cohortFilter: params.cohortFilter,
      },
      config,
      now
    );

    if (evalRes.eligible) {
      eligibleInputs.push(candidateInput);
    } else if (
      evalRes.reason === "COOLDOWN" &&
      d.lastDonationAt &&
      evalRes.nextEligibleAt
    ) {
      cooldownExcludedDonors.push({
        id: d.id,
        fullName: d.fullName,
        bloodGroup: d.bloodGroup,
        lastDonationAt: d.lastDonationAt.toISOString(),
        nextEligibleAt: evalRes.nextEligibleAt.toISOString(),
        daysRemaining: evalRes.daysRemainingInCooldown || 1,
        reasonText:
          evalRes.reasonText ||
          `Terakhir donor ${formatShortDateWIB(d.lastDonationAt)}`,
      });
    } else {
      otherExcludedCount += 1;
    }
  }

  // Urutkan donor masa jeda berdasarkan hari tersisa paling sedikit
  cooldownExcludedDonors.sort((a, b) => a.daysRemaining - b.daysRemaining);

  const mlResult = await scoreDonorsWithMlOrFallback(
    eligibleInputs.map((d) => ({
      id: d.id,
      lastDonationAt: d.lastDonationAt,
      firstDonationAt: d.firstDonationAt,
      donationCount: d.donationCount,
    })),
    now,
    config,
    {
      forceFallback: options?.forceFallback,
      serviceUrlOverride: options?.mlServiceUrlOverride,
    }
  );

  const prelim: Omit<RankedDonorCandidate, "rank" | "selected">[] =
    eligibleInputs.map((d) => {
      const scoreObj = mlResult.scoresById.get(d.id) || {
        id: d.id,
        p: config.firstTimerPrior,
        prior: true,
        reasons: [],
      };
      const priorityScore = computePriorityWithFatigue(
        scoreObj.p,
        d.invitesLast30d,
        config.invitation.maxPerDonor30d
      );
      return {
        id: d.id,
        fullName: d.fullName,
        bloodGroup: d.bloodGroup,
        lastDonationAt: d.lastDonationAt,
        firstDonationAt: d.firstDonationAt,
        donationCount: d.donationCount,
        invitesLast30d: d.invitesLast30d,
        p: scoreObj.p,
        priorityScore,
        prior: scoreObj.prior,
        reasons: scoreObj.reasons,
        summaryReason: formatCandidateSummaryReason(
          scoreObj.prior,
          d.donationCount,
          scoreObj.reasons
        ),
      };
    });

  prelim.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    if (b.donationCount !== a.donationCount) {
      return b.donationCount - a.donationCount;
    }
    return a.id.localeCompare(b.id);
  });

  const sortedP = prelim.map((c) => c.p);
  const { selectedK, expectedUnits, requiredExpected } = selectInviteCountK(
    sortedP,
    params.targetUnits,
    config,
    params.customInviteCount
  );

  const candidates: RankedDonorCandidate[] = prelim.map((c, idx) => ({
    ...c,
    rank: idx + 1,
    selected: idx < selectedK,
  }));

  // Hitung kapasitas slot yang masih tersedia sampai deadlineAt
  const slotsUntilDeadline = await db.slot.findMany({
    where: {
      branchId,
      startsAt: {
        gt: now,
        lte: params.deadlineAt,
      },
    },
    select: {
      capacity: true,
      bookedCount: true,
    },
  });

  const availableSlotCapacity = slotsUntilDeadline.reduce(
    (acc, s) => acc + Math.max(0, s.capacity - s.bookedCount),
    0
  );

  const warnings = buildCampaignWarnings({
    eligibleCount: candidates.length,
    selectedK,
    expectedUnits,
    targetUnits: params.targetUnits,
    availableSlotCapacity,
    usedFallback: mlResult.usedFallback,
  });

  return {
    branchId,
    branchName: branch?.name || "UTD PMI Kota Surabaya",
    group: params.group,
    targetUnits: params.targetUnits,
    deadlineAt: params.deadlineAt.toISOString(),
    modelVersion: mlResult.modelVersion,
    usedFallback: mlResult.usedFallback,
    eligibleCount: candidates.length,
    selectedK,
    expectedUnits,
    requiredExpected,
    availableSlotCapacity,
    candidates,
    cooldownExcludedCount: cooldownExcludedDonors.length,
    cooldownExcludedDonors,
    otherExcludedCount,
    warnings,
  };
}

export async function createCampaignDraftOrSend(params: {
  branchId?: string;
  group: BloodGroupCode;
  targetUnits: number;
  deadlineAt: Date;
  cohortFilter?: string | null;
  customInviteCount?: number | null;
  createdById: string;
  sendImmediately?: boolean;
}) {
  const branchId = params.branchId || env.DEFAULT_BRANCH_ID;
  const preview = await generateCampaignPreview({
    branchId,
    group: params.group,
    targetUnits: params.targetUnits,
    deadlineAt: params.deadlineAt,
    cohortFilter: params.cohortFilter,
    customInviteCount: params.customInviteCount,
  });

  const campaign = await db.campaign.create({
    data: {
      branchId,
      group: params.group as BloodGroup,
      targetUnits: params.targetUnits,
      deadlineAt: params.deadlineAt,
      status: "DRAFT",
      cohortFilter: params.cohortFilter || null,
      customInviteCount: params.customInviteCount || null,
      modelVersion: preview.modelVersion,
      createdById: params.createdById,
    },
  });

  if (params.sendImmediately) {
    return sendCampaignInvitations(campaign.id, params.createdById);
  }

  return { campaign, invitations: [], preview };
}

/**
 * Mengirim undangan untuk suatu permintaan donor (idempoten sesuai planning.md 11.2)
 */
export async function sendCampaignInvitations(
  campaignId: string,
  actorId: string,
  now: Date = new Date()
) {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: {
      branch: true,
      invitations: {
        include: { donor: true },
        orderBy: { rank: "asc" },
      },
    },
  });

  if (!campaign) {
    throw new Error("Permintaan donor tidak ditemukan.");
  }

  // Idempoten: bila sudah pernah dikirim dan memiliki undangan, kembalikan langsung
  if (campaign.status === "ACTIVE" && campaign.invitations.length > 0) {
    const enriched = campaign.invitations.map((inv) => {
      const { rawToken } = deriveInvitationToken(inv.id, env.AUTH_SECRET);
      const links = buildInvitationLinks({
        rawToken,
        donorName: inv.donor.fullName,
        donorPhone: inv.donor.phone,
        bloodGroup: campaign.group as BloodGroupCode,
        branchName: campaign.branch.name,
        deadlineAt: campaign.deadlineAt,
      });
      return { ...inv, rawToken, links };
    });
    return { campaign, invitations: enriched, alreadySent: true };
  }

  const config = parseBranchRules(campaign.branch.rules);
  const preview = await generateCampaignPreview(
    {
      branchId: campaign.branchId,
      group: campaign.group as BloodGroupCode,
      targetUnits: campaign.targetUnits,
      deadlineAt: campaign.deadlineAt,
      cohortFilter: campaign.cohortFilter,
      customInviteCount: campaign.customInviteCount,
    },
    { now }
  );

  const selectedCandidates = preview.candidates.filter((c) => c.selected);
  const expiresByHours = new Date(
    now.getTime() + config.invitation.expiresHours * 3600 * 1000
  );
  const expiresAt =
    expiresByHours < campaign.deadlineAt ? expiresByHours : campaign.deadlineAt;

  const createdInvitations = [];

  for (const candidate of selectedCandidates) {
    const invId = `inv_${campaign.id.slice(-8)}_${candidate.rank}`;
    const { rawToken, tokenHash } = deriveInvitationToken(
      invId,
      env.AUTH_SECRET
    );

    const inv = await db.invitation.upsert({
      where: {
        campaignId_donorId: {
          campaignId: campaign.id,
          donorId: candidate.id,
        },
      },
      update: {},
      create: {
        id: invId,
        campaignId: campaign.id,
        donorId: candidate.id,
        tokenHash,
        status: "SENT",
        score: candidate.priorityScore,
        rank: candidate.rank,
        reasons: JSON.parse(JSON.stringify(candidate.reasons)),
        channel: "EMAIL",
        sentAt: now,
        expiresAt,
      },
      include: {
        donor: true,
      },
    });

    const links = buildInvitationLinks({
      rawToken,
      donorName: inv.donor.fullName,
      donorPhone: inv.donor.phone,
      bloodGroup: campaign.group as BloodGroupCode,
      branchName: campaign.branch.name,
      deadlineAt: campaign.deadlineAt,
    });

    createdInvitations.push({ ...inv, rawToken, links });
  }

  const updatedCampaign = await db.campaign.update({
    where: { id: campaign.id },
    data: {
      status: "ACTIVE",
      sentAt: now,
      modelVersion: preview.modelVersion,
    },
  });

  await db.eventLog.create({
    data: {
      name: "campaign_sent",
      actorId,
      role: "COORDINATOR",
      entityId: campaign.id,
      meta: {
        group: campaign.group,
        targetUnits: campaign.targetUnits,
        invitedCount: createdInvitations.length,
        expectedUnits: preview.expectedUnits,
        usedFallback: preview.usedFallback,
      },
    },
  });

  return {
    campaign: updatedCampaign,
    invitations: createdInvitations,
    preview,
    alreadySent: false,
  };
}

