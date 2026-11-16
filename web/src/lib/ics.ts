/**
 * Generator file kalender (.ics) untuk tombol "Tambah ke kalender" pada tiket donor
 * sesuai planning.md Bagian 3.1 (Should) & design.md Bagian 6.9
 */
export function generateTicketIcs(params: {
  bookingCode: string;
  donorName: string;
  branchName: string;
  startsAt: Date;
  endsAt: Date;
}): string {
  const formatIcsDate = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const uid = `nadikita-${params.bookingCode}@nadikita.test`;
  const dtStamp = formatIcsDate(new Date());
  const dtStart = formatIcsDate(params.startsAt);
  const dtEnd = formatIcsDate(params.endsAt);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nadi Kita//STACK 2026//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Jadwal Donor Darah (${params.branchName})`,
    `LOCATION:${params.branchName}`,
    `DESCRIPTION:Tiket donor Nadi Kita (Kode: NK-${params.bookingCode}). Bawa kartu identitas dan datang 10 menit lebih awal.`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

