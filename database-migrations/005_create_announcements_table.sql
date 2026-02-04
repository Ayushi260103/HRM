-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Drop policies if they already exist
DROP POLICY IF EXISTS select_announcements_authenticated ON announcements;
DROP POLICY IF EXISTS insert_announcements_authenticated ON announcements;

-- Allow all authenticated users to view announcements
CREATE POLICY select_announcements_authenticated
  ON announcements
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to create announcements for themselves
CREATE POLICY insert_announcements_authenticated
  ON announcements
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);
