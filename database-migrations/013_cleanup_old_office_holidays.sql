-- Ensure pg_cron is available
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_office_holidays()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM office_holidays
  WHERE date < CURRENT_DATE - INTERVAL '7 days';
END;
$$;

-- Make sure function is owned by a privileged role
ALTER FUNCTION cleanup_old_office_holidays() OWNER TO postgres;

-- Prevent normal users from executing it
REVOKE ALL ON FUNCTION cleanup_old_office_holidays() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_old_office_holidays() TO postgres;
