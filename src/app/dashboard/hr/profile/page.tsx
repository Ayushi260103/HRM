'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';

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

export default function EmployeeProfilePage() {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<EmployeeProfile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError('User not authenticated');
          return;
        }

        setEmail(user.email ?? null);

        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (fetchError) throw fetchError;
        setProfile(data);
        setEditData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [supabase]);

  const toDateInput = (value?: string) => (value ? value.slice(0, 10) : '');

  const handleSave = async () => {
    if (!editData) return;
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: editData.full_name,
          department: editData.department,
          position: editData.position,
          phone: editData.phone,
          hire_date: editData.hire_date,
          dob: editData.dob,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, ...editData } : editData);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData(profile);
    setIsEditing(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      
      if (!file) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('employee-avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: data.publicUrl } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p>Loading profile...</p></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-red-600">Error: {error}</p></div>;
  if (!profile) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p>Profile not found</p></div>;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={email} userName={profile.full_name} avatarUrl={profile.avatar_url} role="hr" />

      <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 lg:ml-64">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-2">View and update your personal information</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="space-y-8">
              {/* Avatar Section */}
              <div className="flex items-center gap-8 pb-8 border-b border-gray-200">
                <div>
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      width={128}
                      height={128}
                      className="w-32 h-32 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-xl bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 text-4xl font-bold">{profile.full_name?.[0]?.toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <label className="cursor-pointer">
                  <span className="block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    {uploading ? '⏳ Uploading...' : '📸 Upload Avatar'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Profile Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData?.full_name || ''}
                      onChange={(e) => setEditData(prev => prev ? { ...prev, full_name: e.target.value } : prev)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900">{profile.full_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Email</label>
                  <p className="text-lg font-semibold text-gray-900">{profile.email_id}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Date of Birth</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={toDateInput(editData?.dob)}
                      onChange={(e) => setEditData(prev => prev ? { ...prev, dob: e.target.value } : prev)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900">{new Date(profile.dob).toLocaleDateString()}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Position</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData?.position || ''}
                      onChange={(e) => setEditData(prev => prev ? { ...prev, position: e.target.value } : prev)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900">{profile.position}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Department</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData?.department || ''}
                      onChange={(e) => setEditData(prev => prev ? { ...prev, department: e.target.value } : prev)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900">{profile.department}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editData?.phone || ''}
                      onChange={(e) => setEditData(prev => prev ? { ...prev, phone: e.target.value } : prev)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900">{profile.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Hire Date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={toDateInput(editData?.hire_date)}
                      onChange={(e) => setEditData(prev => prev ? { ...prev, hire_date: e.target.value } : prev)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900">{new Date(profile.hire_date).toLocaleDateString()}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
