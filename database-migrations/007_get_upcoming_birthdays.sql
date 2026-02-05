-- Function returns only birthday-safe fields (no email, phone, hire_date, etc.)
-- Allows all authenticated users to see upcoming birthdays without exposing full profile data

CREATE OR REPLACE FUNCTION get_upcoming_birthdays()
RETURNS TABLE (
  id uuid,
  full_name text,
  department text,
  job_title text,
  dob date,
  avatar_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    p.department,
    p.position AS job_title,
    p.dob,
    p.avatar_url
  FROM public.profiles p
  WHERE p.status = 'active'
    AND p.dob IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION get_upcoming_birthdays() TO authenticated;
