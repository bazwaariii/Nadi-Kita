-- Migrasi SQL tambahan sesuai planning.md Bagian 8.2:
-- 1. Indeks unik parsial satu booking aktif per donor
CREATE UNIQUE INDEX IF NOT EXISTS one_active_booking_per_donor
  ON "Booking" ("donorId") WHERE status IN ('CONFIRMED', 'CHECKED_IN');

-- 2. Constraint kapasitas slot (PostgreSQL)
-- ALTER TABLE "Slot" ADD CONSTRAINT booked_within_capacity
--   CHECK ("bookedCount" >= 0 AND "bookedCount" <= capacity);

