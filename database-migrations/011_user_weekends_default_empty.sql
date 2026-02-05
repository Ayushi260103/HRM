-- Change default weekend_days to empty (no week-offs by default)
-- Run this if you already have user_weekends table from migration 010

ALTER TABLE user_weekends
  ALTER COLUMN weekend_days SET DEFAULT '{}';
