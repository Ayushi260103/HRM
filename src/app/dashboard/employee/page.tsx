'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Notifications from '@/components/Notifications';

interface EmployeeProfile {
  id: string;
  full_name: string;
  department: string;
  position: string;
  phone: string;
  hire_date: string;
  dob: string;
  avatar_url?: string;
  email_id?: string;
}

export default function EmployeeDashboard() {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [logId, setLogId] = useState<string | null>(null);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Check profile and get user info
  useEffect(() => {
    const checkProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }

        setEmail(user.email ?? null);
        setUserId(user.id);

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          router.push('/profile-completion');
          return;
        }

        // Check if any required field is incomplete
        const requiredFields = ['full_name', 'department', 'position', 'phone', 'hire_date', 'dob'];
        const isProfileIncomplete = requiredFields.some(field => !data[field]);

        if (isProfileIncomplete || !data.avatar_url) {
          router.push('/profile-completion');
          return;
        }

        setProfile(data);
      } catch (error) {
        console.error('Profile check failed:', error);
        router.push('/profile-completion');
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
  }, [router, supabase]);

  // Load today's attendance
  useEffect(() => {
    if (!userId) return;

    const loadAttendance = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('clock_in', today)
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setLogId(data.id);
        setClockInTime(data.clock_in);
        setClockOutTime(data.clock_out);
      }
      setLoadingAttendance(false);
    };

    loadAttendance();
  }, [userId, supabase]);

  // 🟢 Clock In
  const handleClockIn = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('attendance_logs')
      .insert([{ user_id: userId }])
      .select()
      .single();

    if (!error && data) {
      setLogId(data.id);
      setClockInTime(data.clock_in);
    }
  };

  // 🔴 Clock Out
  const handleClockOut = async () => {
    if (!logId) return;

    const { data, error } = await supabase
      .from('attendance_logs')
      .update({ clock_out: new Date().toISOString() })
      .eq('id', logId)
      .select()
      .single();

    if (!error && data) {
      setClockOutTime(data.clock_out);
    }
  };

  const formatTime = (time: string | null) =>
    time ? new Date(time).toLocaleTimeString() : '--';

  if (loading) return <div className="p-8">Loading dashboard...</div>;
  if (!profile) return <div className="p-8">Redirecting...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={email} userName={profile.full_name} avatarUrl={profile.avatar_url} role="employee" />

      {/* Notification Bell */}
      <div className="fixed top-4 right-4 z-50 lg:top-6 lg:right-8">
        {userId && <Notifications role="employee" userId={userId} />}
      </div>

      <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 lg:ml-64">
        <div className="w-full max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Employee Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your profile and track attendance</p>
          </div>

          {/* Clock In / Out Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Today&apos;s Attendance</h3>

              {loadingAttendance ? (
                <p className="text-gray-500 text-center py-8">Loading attendance records...</p>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-2">Clock In Time</p>
                      <p className="text-2xl font-bold text-gray-900">{formatTime(clockInTime)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-2">Clock Out Time</p>
                      <p className="text-2xl font-bold text-gray-900">{formatTime(clockOutTime)}</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    {!clockInTime && (
                      <button
                        onClick={handleClockIn}
                        className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                      >
                        🟢 Clock In
                      </button>
                    )}

                    {clockInTime && !clockOutTime && (
                      <button
                        onClick={handleClockOut}
                        className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                      >
                        🔴 Clock Out
                      </button>
                    )}

                    {clockOutTime && (
                      <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <p className="text-green-700 font-semibold">✅ Shift Completed</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
      </main>
    </div>
  );
}
