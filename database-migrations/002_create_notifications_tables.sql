-- Create notifications table and notification_reads
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_target TEXT, -- 'admin' | 'hr' or NULL
  for_user UUID NULL, -- specific user (employee) or NULL
  source_table TEXT, -- e.g., 'leave_requests' or 'profiles'
  source_id UUID NULL, -- id of the source record
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_role_target ON notifications(role_target);
CREATE INDEX IF NOT EXISTS idx_notifications_for_user ON notifications(for_user);

-- Tracks which user has read a notification
CREATE TABLE IF NOT EXISTS notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_reads_user ON notification_reads(user_id);

-- Trigger functions to insert notifications

-- 1) New pending profile request -> notify admin
CREATE OR REPLACE FUNCTION notify_on_new_profile() RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'pending') THEN
    INSERT INTO notifications(role_target, source_table, source_id, message)
    VALUES('admin', 'profiles', NEW.id, NEW.full_name || ' applied and is pending approval');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_new_profile ON profiles;
CREATE TRIGGER trg_notify_new_profile
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE PROCEDURE notify_on_new_profile();

-- 2) New leave request -> notify admin and hr
CREATE OR REPLACE FUNCTION notify_on_new_leave_request() RETURNS TRIGGER AS $$
DECLARE
  leave_type_name TEXT;
  requester_name TEXT;
  requester_role TEXT;
BEGIN
  SELECT name INTO leave_type_name FROM leave_types WHERE id = NEW.leave_type_id;
  SELECT full_name, role INTO requester_name, requester_role FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications(role_target, source_table, source_id, message)
  VALUES(
    'admin',
    'leave_requests',
    NEW.id,
    'New leave request from ' || COALESCE(requester_name, NEW.user_id::text) || ' (' || COALESCE(leave_type_name, 'leave') || ')'
  );

  IF requester_role = 'employee' THEN
    INSERT INTO notifications(role_target, source_table, source_id, message)
    VALUES(
      'hr',
      'leave_requests',
      NEW.id,
      'New leave request from ' || COALESCE(requester_name, NEW.user_id::text) || ' (' || COALESCE(leave_type_name, 'leave') || ')'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_new_leave ON leave_requests;
CREATE TRIGGER trg_notify_new_leave
AFTER INSERT ON leave_requests
FOR EACH ROW
EXECUTE PROCEDURE notify_on_new_leave_request();

-- 3) Leave status change -> notify the employee (for_user)
CREATE OR REPLACE FUNCTION notify_on_leave_status_change() RETURNS TRIGGER AS $$
DECLARE
  leave_type_name TEXT;
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status <> OLD.status) THEN
    SELECT name INTO leave_type_name FROM leave_types WHERE id = NEW.leave_type_id;
    INSERT INTO notifications(for_user, source_table, source_id, message)
    VALUES(
      NEW.user_id,
      'leave_requests',
      NEW.id,
      'Your ' || COALESCE(leave_type_name, 'leave') || ' request has been ' || NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_leave_status_change ON leave_requests;
CREATE TRIGGER trg_notify_leave_status_change
AFTER UPDATE ON leave_requests
FOR EACH ROW
EXECUTE PROCEDURE notify_on_leave_status_change();

-- Enable RLS policies could be added here as needed, but leave that to project DB admin

-- Row-Level Security (RLS) policies
-- NOTE: These policies assume you have a `profiles` table with `id` = auth.uid() and a `role` column
-- Adjust conditions if your auth/profile setup differs. Triggers that run as the DB owner/service role will bypass RLS.

-- Enable RLS on notifications
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- Allow SELECT for notifications targeted to the current authenticated user
-- or to the role that matches the user's profile.role
CREATE POLICY IF NOT EXISTS select_notifications_for_targeted_users
  ON notifications
  FOR SELECT
  USING (
    (for_user IS NOT NULL AND for_user = auth.uid())
    OR (
      role_target IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = role_target
      )
    )
  );

-- Allow INSERT by authenticated callers (e.g., server functions or application)
-- Triggers executed by the DB owner/service will bypass RLS; keep this permissive for typical app flows.
CREATE POLICY IF NOT EXISTS insert_notifications_authenticated
  ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Optional: allow admins to DELETE their related notifications
CREATE POLICY IF NOT EXISTS delete_notifications_by_admin
  ON notifications
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Enable RLS on notification_reads
ALTER TABLE IF EXISTS notification_reads ENABLE ROW LEVEL SECURITY;

-- Allow users to SELECT only their own notification_reads
CREATE POLICY IF NOT EXISTS select_own_notification_reads
  ON notification_reads
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow users to INSERT only reads for themselves (mark notifications as read)
CREATE POLICY IF NOT EXISTS insert_own_notification_reads
  ON notification_reads
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow users to DELETE their own reads (if you want to allow un-reading)
CREATE POLICY IF NOT EXISTS delete_own_notification_reads
  ON notification_reads
  FOR DELETE
  USING (user_id = auth.uid());

-- IMPORTANT: Review these policies in the context of your Supabase auth JWT claims.
-- If you keep user roles in a separate table (e.g., `profiles.role`), the EXISTS(...) checks will work.
-- If you store role in JWT custom claims, you can replace the EXISTS check with something like:
--   role_target = current_setting('jwt.claims.role', true)
-- but that depends on how tokens are configured.


