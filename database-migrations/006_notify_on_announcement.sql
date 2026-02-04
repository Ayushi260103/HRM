-- Notify users when announcements are created

CREATE OR REPLACE FUNCTION notify_on_new_announcement() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.author_role = 'admin' THEN
    -- Notify HR and employees
    INSERT INTO notifications(role_target, source_table, source_id, message)
    VALUES
      ('hr', 'announcements', NEW.id, 'New announcement: ' || NEW.title),
      ('employee', 'announcements', NEW.id, 'New announcement: ' || NEW.title);
  ELSIF NEW.author_role = 'hr' THEN
    -- Notify employees
    INSERT INTO notifications(role_target, source_table, source_id, message)
    VALUES
      ('employee', 'announcements', NEW.id, 'New announcement: ' || NEW.title);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_new_announcement ON announcements;
CREATE TRIGGER trg_notify_new_announcement
AFTER INSERT ON announcements
FOR EACH ROW
EXECUTE PROCEDURE notify_on_new_announcement();
