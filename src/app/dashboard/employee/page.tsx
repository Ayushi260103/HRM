'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

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
  const [activeTab, setActiveTab] = useState<'profile' | 'attendance'>('profile');
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const formatTime = (time: string | null) =>
    time ? new Date(time).toLocaleTimeString() : '--';

  if (loading) return <div className="p-8">Loading dashboard...</div>;
  if (!profile) return <div className="p-8">Redirecting...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            ← Dashboards
          </Link>
          <h1 className="text-xl font-semibold">HRM</h1>
        </div>
        <div className="flex items-center gap-4">
          {email && <span className="text-sm text-gray-500">{email}</span>}
          <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-gray-900">
            Log out
          </button>
        </div>
      </header>

      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Employee Dashboard</h1>
            <div className="flex items-center gap-4">
              {profile.avatar_url && (
                <Image
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover"
                />
              )}
              <div>
                <p className="font-semibold">{profile.full_name}</p>
                <p className="text-sm text-gray-600">{profile.position}</p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-md mb-6">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-4 px-6 font-semibold text-center ${
                  activeTab === 'profile'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`flex-1 py-4 px-6 font-semibold text-center ${
                  activeTab === 'attendance'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Clock In / Clock Out
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'profile' && (
            <Link href="/dashboard/employee/profile">
              <div className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition">
                <p className="text-gray-600 mb-4">View and manage your profile information</p>
                <button className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                  Go to Profile →
                </button>
              </div>
            </Link>
          )}

          {activeTab === 'attendance' && (
            <div className="bg-white rounded-lg shadow-md p-8 space-y-4">
              <h3 className="text-lg font-semibold">Today&apos;s Attendance</h3>

              {loadingAttendance ? (
                <p className="text-sm text-gray-500">Loading attendance...</p>
              ) : (
                <>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Clock In: <strong>{formatTime(clockInTime)}</strong></p>
                    <p>Clock Out: <strong>{formatTime(clockOutTime)}</strong></p>
                  </div>

                  {!clockInTime && (
                    <button
                      onClick={handleClockIn}
                      className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
                    >
                      Clock In
                    </button>
                  )}

                  {clockInTime && !clockOutTime && (
                    <button
                      onClick={handleClockOut}
                      className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
                    >
                      Clock Out
                    </button>
                  )}

                  {clockOutTime && (
                    <p className="text-green-600 text-sm font-medium">
                      Shift completed ✅
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
