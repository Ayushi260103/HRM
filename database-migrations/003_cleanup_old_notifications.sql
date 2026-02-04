-- Cleanup notifications older than 7 days and related reads

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION cleanup_old_notifications() RETURNS void AS $$
BEGIN
  DELETE FROM notification_reads
  WHERE notification_id IN (
    SELECT id FROM notifications
    WHERE created_at < NOW() - INTERVAL '7 days'
  );

  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup_old_notifications'
  ) THEN
    PERFORM cron.schedule(
      'cleanup_old_notifications',
      '0 3 * * *',
      'SELECT cleanup_old_notifications();'
    );
  END IF;
END $$;

