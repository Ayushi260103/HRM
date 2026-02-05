-- Allow all authenticated users to read office_holidays (needed for clock-in check)
CREATE POLICY "Authenticated users can read office_holidays"
  ON office_holidays FOR SELECT
  USING (auth.uid() IS NOT NULL);
