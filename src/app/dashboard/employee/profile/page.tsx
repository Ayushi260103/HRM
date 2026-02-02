'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
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

export default function EmployeeProfilePage() {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError('User not authenticated');
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (fetchError) throw fetchError;
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [supabase]);

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

  if (loading) return <div className="p-8">Loading profile...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!profile) return <div className="p-8">Profile not found</div>;

  return (
    <div className="p-8">
      <Link href="/dashboard/employee" className="mb-4 text-blue-600 hover:underline">
        ← Back to Dashboard
      </Link>

      <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Employee Profile</h1>

        <div className="space-y-6">
          <div className="flex items-center gap-6">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name}
                width={128}
                height={128}
                className="w-32 h-32 rounded-full object-cover"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600">No Image</span>
              </div>
            )}
            <label className="cursor-pointer">
              <span className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                {uploading ? 'Uploading...' : 'Upload Avatar'}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-600">Full Name</label>
              <p className="text-lg">{profile.full_name}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Email</label>
              <p className="text-lg">{profile.email_id}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Date of Birth</label>
              <p className="text-lg">{new Date(profile.dob).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Position</label>
              <p className="text-lg">{profile.position}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Department</label>
              <p className="text-lg">{profile.department}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Phone</label>
              <p className="text-lg">{profile.phone}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Hire Date</label>
              <p className="text-lg">{new Date(profile.hire_date).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
