'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSupabase } from '@/hooks/useSupabase';
import Image from 'next/image';
import { capitalizeName } from '@/lib/utils/string';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import { ProfileCard, ProfileField } from '@/components/ProfileCard';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const emptyValue = (v: string | null | undefined) => !v || String(v).trim() === '' ? null : v;

function getAgeFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

interface EmployeeProfile {
  id: string;
  full_name: string;
  department: string;
  position: string;
  phone: string;
  hire_date: string;
  joining_date: string;
  dob: string;
  avatar_url?: string;
  email_id?: string;
  years_of_experience: number;
  gender?: string | null;
  marital_status?: string | null;
  address?: string | null;
  education?: string | null;
  salary?: number | null;
}

export default function HRProfilePage() {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<EmployeeProfile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const supabase = useSupabase();

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
  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  const formatCurrency = (v: number | null | undefined) =>
    v != null ? `â‚¹${Number(v).toLocaleString('en-IN')}` : '—';

  const handleSave = async () => {
    if (!editData) return;
    if (editData.joining_date && editData.hire_date && editData.joining_date < editData.hire_date) {
      setError('Joining date must be on or after hire date');
      return;
    }
    if (editData.salary != null && (isNaN(editData.salary) || editData.salary < 0)) {
      setError('Enter a valid salary (non-negative number)');
      return;
    }
    try {
      setSaving(true);
      setError(null);
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
          joining_date: editData.joining_date,
          dob: editData.dob,
          years_of_experience: editData.years_of_experience,
          salary: editData.salary != null ? editData.salary : null,
          gender: editData.gender ?? null,
          marital_status: editData.marital_status ?? null,
          address: editData.address ?? null,
          education: editData.education ?? null,
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
      const file = event.target.files?.[0];
      if (!file) return;

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Only JPG, PNG, or WEBP images allowed.');
        event.target.value = '';
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError('Image must be smaller than 2MB.');
        event.target.value = '';
        return;
      }

      setUploading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        setUploading(false);
        event.target.value = '';
        return;
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        setError(uploadError.message);
        setUploading(false);
        event.target.value = '';
        return;
      }

      const { data } = supabase.storage
        .from('employee-avatars')
        .getPublicUrl(filePath);

      const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) {
        setError(updateError.message);
      } else {
        setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <p className="text-sm text-slate-500">Loading profile...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4" style={{ background: 'var(--background)' }}>
        <p className="text-red-600 text-center">Error: {error}</p>
        <div className="flex gap-4">
          {profile && (
            <button
              onClick={() => setError(null)}
              className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium"
            >
              Back to Profile
            </button>
          )}
          <Link
            href="/dashboard/hr/home"
            className="px-4 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <p className="text-slate-500">Profile not found</p>
      </div>
    );
  }

  const displayEmail = email || profile.email_id;
  const joiningDate = profile.joining_date ? formatDate(profile.joining_date) : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <Sidebar userEmail={email} userName={profile.full_name} avatarUrl={profile.avatar_url} role="hr" />

      <main className="admin-main">
        <div className="w-full max-w-4xl mx-auto">
          <PageHeader
            title="My Profile"
            subtitle="View and update your personal information"
            actions={
              isEditing ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-lg font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-colors"
                >
                  Edit Profile
                </button>
              )
            }
          />

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <div className="shrink-0">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-[var(--primary-light)] flex items-center justify-center">
                    <span className="text-[var(--primary)] text-2xl font-bold">
                      {profile.full_name?.[0]?.toUpperCase() ?? '?'}
                    </span>
                  </div>
                )}
                <label className="mt-2 block">
                  <span className="inline-block text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] cursor-pointer">
                    {uploading ? 'Uploading...' : 'Change photo'}
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

              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-slate-900">{capitalizeName(profile.full_name)}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {[profile.position, profile.department].filter(Boolean).join(' | ') || '—'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm w-full sm:w-auto sm:min-w-[200px]">
                <div>
                  <p className="text-slate-500">Email</p>
                  <p className="text-slate-900 font-medium mt-0.5">{displayEmail || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Phone</p>
                  <p className="text-slate-900 font-medium mt-0.5">{profile.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Joining date</p>
                  <p className="text-slate-900 font-medium mt-0.5">{joiningDate || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Age</p>
                  <p className="text-slate-900 font-medium mt-0.5">{getAgeFromDob(profile.dob) ?? '—'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProfileCard title="Personal information" onEdit={!isEditing ? () => setIsEditing(true) : undefined}>
              <ProfileField
                label="Date of birth"
                value={
                  isEditing && editData ? (
                    <input
                      type="date"
                      value={toDateInput(editData.dob)}
                      onChange={e => setEditData(prev => prev ? { ...prev, dob: e.target.value } : prev)}
                      className="w-full text-right rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none"
                    />
                  ) : (
                    (profile.dob && formatDate(profile.dob)) ?? '—'
                  )
                }
              />
              <ProfileField
                label="Gender"
                value={
                  isEditing && editData ? (
                    <select
                      value={editData.gender ?? ''}
                      onChange={e => setEditData(prev => prev ? { ...prev, gender: e.target.value || null } : prev)}
                      className="w-full text-right rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none"
                    >
                      <option value="">—</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  ) : (
                    profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1).toLowerCase() : '—'
                  )
                }
              />
              <ProfileField
                label="Marital status"
                value={
                  isEditing && editData ? (
                    <select
                      value={editData.marital_status ?? ''}
                      onChange={e => setEditData(prev => prev ? { ...prev, marital_status: e.target.value || null } : prev)}
                      className="w-full text-right rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none"
                    >
                      <option value="">—</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  ) : (
                    profile.marital_status ? profile.marital_status.charAt(0).toUpperCase() + profile.marital_status.slice(1).toLowerCase() : '—'
                  )
                }
              />
              <ProfileField
                label="Address"
                value={
                  isEditing && editData ? (
                    <input
                      type="text"
                      value={editData.address ?? ''}
                      onChange={e => setEditData(prev => prev ? { ...prev, address: e.target.value } : prev)}
                      placeholder="—"
                      className="w-full text-right rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none"
                    />
                  ) : (
                    (emptyValue(profile.address) || '—') as string
                  )
                }
              />
              <ProfileField label="Age" value={getAgeFromDob(profile.dob) != null ? String(getAgeFromDob(profile.dob)) : '—'} />
            </ProfileCard>

            <ProfileCard title="Professional information" onEdit={!isEditing ? () => setIsEditing(true) : undefined}>
              <ProfileField
                label="Department"
                value={
                  isEditing && editData ? (
                    <input
                      type="text"
                      value={editData.department ?? ''}
                      onChange={e => setEditData(prev => prev ? { ...prev, department: e.target.value } : prev)}
                      className="w-full text-right rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none"
                    />
                  ) : (
                    profile.department || '—'
                  )
                }
              />
              <ProfileField
                label="Position"
                value={
                  isEditing && editData ? (
                    <input
                      type="text"
                      value={editData.position ?? ''}
                      onChange={e => setEditData(prev => prev ? { ...prev, position: e.target.value } : prev)}
                      className="w-full text-right rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none"
                    />
                  ) : (
                    profile.position || '—'
                  )
                }
              />
              <ProfileField
                label="Joining date"
                value={
                  isEditing && editData ? (
                    <input
                      type="date"
                      value={toDateInput(editData.joining_date)}
                      onChange={e => setEditData(prev => prev ? { ...prev, joining_date: e.target.value } : prev)}
                      className="w-full text-right rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none"
                    />
                  ) : (
                    joiningDate ?? '—'
                  )
                }
              />
              <ProfileField
                label="Experience (Years)"
                value={
                  isEditing && editData ? (
                    <input
                      type="number"
                      value={editData.years_of_experience ?? ''}
                      onChange={e =>
                        setEditData(prev =>
                          prev ? { ...prev, years_of_experience: parseInt(e.target.value, 10) || 0 } : prev
                        )
                      }
                      className="w-full text-right rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none"
                    />
                  ) : (
                    (profile.years_of_experience != null ? String(profile.years_of_experience) : null) ?? '—'
                  )
                }
              />
              <ProfileField
                label="Salary"
                value={
                  isEditing && editData ? (
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={editData.salary != null ? editData.salary : ''}
                      onChange={e => {
                        const val = e.target.value;
                        setEditData(prev => prev ? { ...prev, salary: val === '' ? null : parseFloat(val) || 0 } : prev);
                      }}
                      placeholder="—"
                      className="w-full text-right rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none"
                    />
                  ) : (
                    formatCurrency(profile.salary)
                  )
                }
              />
            </ProfileCard>

            <ProfileCard title="Education information" onEdit={!isEditing ? () => setIsEditing(true) : undefined}>
              <ProfileField
                label="Highest education"
                value={
                  isEditing && editData ? (
                    <textarea
                      value={editData.education ?? ''}
                      onChange={e => setEditData(prev => prev ? { ...prev, education: e.target.value } : prev)}
                      placeholder="Enter your highest education"
                      rows={3}
                      className="w-full text-right rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none resize-y"
                    />
                  ) : (
                    (emptyValue(profile.education) || '—') as string
                  )
                }
              />
            </ProfileCard>

            <ProfileCard title="Account information">
              <ProfileField label="Email" value={displayEmail ?? '—'} />
              <ProfileField label="Phone" value={profile.phone ?? '—'} />
            </ProfileCard>
          </div>
        </div>
      </main>
    </div>
  );
}
