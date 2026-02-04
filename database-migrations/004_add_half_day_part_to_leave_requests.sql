-- Add half day part column for leave requests

ALTER TABLE leave_requests
ADD COLUMN IF NOT EXISTS half_day_part TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leave_requests_half_day_part_check'
  ) THEN
    ALTER TABLE leave_requests
    ADD CONSTRAINT leave_requests_half_day_part_check
    CHECK (half_day_part IS NULL OR half_day_part IN ('first', 'second'));
  END IF;
END $$;
