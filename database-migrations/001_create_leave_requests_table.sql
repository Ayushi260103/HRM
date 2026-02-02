-- Create leave_requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('half_day', 'medical', 'casual')),
  reason TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- Enable RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Employees can view their own leave requests
CREATE POLICY "Users can view their own leave requests"
  ON leave_requests
  FOR SELECT
  USING (auth.uid() = user_id OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('hr', 'admin'));

-- Employees can create their own leave requests
CREATE POLICY "Users can create their own leave requests"
  ON leave_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only HR and Admin can update leave request status
CREATE POLICY "HR and Admin can update leave requests"
  ON leave_requests
  FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('hr', 'admin'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('hr', 'admin'));
