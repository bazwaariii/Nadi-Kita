import {
  BLOOD_GROUP_META,
  BloodGroupCode,
  formatDateWIB,
} from "@/lib/format-tanggal";
import { env } from "@/server/env";

export interface InvitationChannelLinks {
  invitationUrl: string;
  whatsappUrl: string;
  emailSubject: string;
  emailBodyText: string;
}

/**
 * K6: Menyusun tautan undangan, pesan email, dan tautan WhatsApp manual (wa.me)
 */
export function buildInvitationLinks(params: {
  rawToken: string;
  donorName: string;
  donorPhone?: string | null;
  bloodGroup: BloodGroupCode;
  branchName: string;
  deadlineAt: Date;
}): InvitationChannelLinks {
  const invitationUrl = `${env.APP_URL}/u/${params.rawToken}`;
  const groupDisplay = BLOOD_GROUP_META[params.bloodGroup].display;
  const deadlineStr = formatDateWIB(params.deadlineAt);

  const messageText = `Halo ${params.donorName}, ${params.branchName} membutuhkan donor golongan darah ${groupDisplay} sebelum ${deadlineStr}. Berdasarkan catatan kami, Anda sudah melewati masa jeda donor. Pilih jam kedatangan Anda melalui tautan berikut: ${invitationUrl}`;

  const cleanPhone = (params.donorPhone || "089900000001")
    .replace(/[^0-9]/g, "")
    .replace(/^0/, "62");
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    messageText
  )}`;

  return {
    invitationUrl,
    whatsappUrl,
    emailSubject: `Undangan Donor Darah Golongan ${groupDisplay} (${params.branchName})`,
    emailBodyText: messageText,
  };
}

