-- Add salary column to profiles for Payroll
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS salary NUMERIC(12, 2) DEFAULT NULL;

COMMENT ON COLUMN public.profiles.salary IS 'Employee salary for payroll display';

-- RPC for Admin/HR to update employee salary (bypasses RLS for profile updates)
CREATE OR REPLACE FUNCTION public.update_employee_salary(emp_id UUID, new_salary NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  target_role TEXT;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  SELECT role INTO target_role FROM profiles WHERE id = emp_id;

  -- Admin can update anyone
  IF caller_role = 'admin' THEN
    UPDATE profiles SET salary = new_salary WHERE id = emp_id;
    RETURN;
  END IF;

  -- HR can update employee and hr, NOT admin
  IF caller_role = 'hr' AND target_role IS NOT NULL AND target_role != 'admin' THEN
    UPDATE profiles SET salary = new_salary WHERE id = emp_id;
    RETURN;
  END IF;

  RAISE EXCEPTION 'Not authorized to update this salary';
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_employee_salary(UUID, NUMERIC) TO authenticated;
