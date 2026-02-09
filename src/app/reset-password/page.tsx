'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import Image from 'next/image'

export default function ResetPasswordPage() {
  const supabase = useSupabase()
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9]">
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <Image
            src="/image/logobg.png"
            alt="Maverix HRM Solutions"
            width={240}
            height={80}
            className="drop-shadow-lg"
          />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-center mb-1">
            Reset password
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            Enter your new password
          </p>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#2563eb]">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm
                focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/30 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2563eb]">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm
                focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/30 outline-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
