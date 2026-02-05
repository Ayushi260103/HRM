-- Office holidays: dates when office is closed (HR/Admin allocate)
CREATE TABLE IF NOT EXISTS office_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_office_holidays_date ON office_holidays(date);

ALTER TABLE office_holidays ENABLE ROW LEVEL SECURITY;

-- Only HR and Admin can manage office holidays
CREATE POLICY "HR and Admin can select office_holidays"
  ON office_holidays FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr', 'admin'))
  );

CREATE POLICY "HR and Admin can insert office_holidays"
  ON office_holidays FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr', 'admin'))
  );

CREATE POLICY "HR and Admin can delete office_holidays"
  ON office_holidays FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr', 'admin'))
  );

-- User weekends: which days of week are off per user (0=Sun, 1=Mon, ..., 6=Sat)
CREATE TABLE IF NOT EXISTS user_weekends (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  weekend_days SMALLINT[] NOT NULL DEFAULT '{}',  -- no default week-offs; HR/Admin allocate
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT valid_weekend_days CHECK (
    weekend_days <@ ARRAY[0,1,2,3,4,5,6]::smallint[] AND array_length(weekend_days, 1) >= 0
  )
);

ALTER TABLE user_weekends ENABLE ROW LEVEL SECURITY;

-- Users can read their own weekend
CREATE POLICY "Users can read own user_weekends"
  ON user_weekends FOR SELECT
  USING (auth.uid() = user_id);

-- HR can read employees' weekends; Admin can read all
CREATE POLICY "HR and Admin can read user_weekends"
  ON user_weekends FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('hr', 'admin')
    )
  );

-- HR can insert/update only for employees (role = 'employee')
CREATE POLICY "HR can manage employee weekends"
  ON user_weekends FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles caller WHERE caller.id = auth.uid() AND caller.role = 'hr')
    AND EXISTS (SELECT 1 FROM profiles target WHERE target.id = user_weekends.user_id AND target.role = 'employee')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles caller WHERE caller.id = auth.uid() AND caller.role = 'hr')
    AND EXISTS (SELECT 1 FROM profiles target WHERE target.id = user_weekends.user_id AND target.role = 'employee')
  );

-- Admin can insert/update for any user (hr or employee)
CREATE POLICY "Admin can manage all user_weekends"
  ON user_weekends FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Allow users to read own row (upsert is done by HR/Admin; user just reads)
-- Already covered by "Users can read own" and "HR and Admin can read"

COMMENT ON TABLE office_holidays IS 'Dates when office is closed; managed by HR/Admin';
COMMENT ON TABLE user_weekends IS 'Which weekdays are off per user; HR sets for employees, Admin sets for HR and employees';
