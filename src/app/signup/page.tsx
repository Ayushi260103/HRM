// 'use client'

// import { useState } from 'react'
// import Link from 'next/link'
// import { createClient } from '@/lib/supabase/client'

// export default function SignupPage() {
//   const [email, setEmail] = useState('')
//   const [error, setError] = useState<string | null>(null)
//   const [loading, setLoading] = useState(false)
//   const [sent, setSent] = useState(false)

//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault()
//     setError(null)
//     setLoading(true)

//     const supabase = createClient()
//     const origin =
//       typeof window !== 'undefined' ? window.location.origin : ''
//     // Supabase requires a password on signup. We use a one-time random password;
//     // the user sets their real password after clicking the email link (/set-password).
//     const tempPassword = crypto.getRandomValues(new Uint8Array(32))
//       .reduce((s, b) => s + (b % 36).toString(36), '') + 'A1a!' // ensure length and complexity
//     const { error: signUpError } = await supabase.auth.signUp({
//       email,
//       password: tempPassword,
//       options: {
//         emailRedirectTo: `${origin}/auth/callback`,
//       },
//     })

//     setLoading(false)

//     if (signUpError) {
//       setError(signUpError.message || 'Something went wrong')
//       return
//     }

//     setSent(true)
//   }

//   if (sent) {
//     return (
//       <div className="min-h-screen flex flex-col">
//         <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
//           <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
//             HRM
//           </h1>
//         </header>
//         <main className="flex-1 flex items-center justify-center p-6">
//           <div className="w-full max-w-sm space-y-6 text-center">
//             <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
//               Check your email
//             </h2>
//             <p className="text-gray-600 dark:text-gray-400">
//               We sent a link to <strong>{email}</strong>. Click the link to set
//               your password, then you can sign in.
//             </p>
//             <p className="text-sm text-gray-500 dark:text-gray-500">
//               <Link
//                 href="/login"
//                 className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
//               >
//                 Back to log in
//               </Link>
//             </p>
//           </div>
//         </main>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen flex flex-col">
//       <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
//         <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
//           HRM
//         </h1>
//       </header>
//       <main className="flex-1 flex items-center justify-center p-6">
//         <div className="w-full max-w-sm space-y-6">
//           <div>
//             <h2 className="text-2xl font-semibold text-center text-gray-900 dark:text-gray-100">
//               Create account
//             </h2>
//             <p className="mt-1 text-sm text-center text-gray-500 dark:text-gray-400">
//               Enter your email. We&apos;ll send you a link to set your password.
//             </p>
//           </div>
//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div>
//               <label
//                 htmlFor="email"
//                 className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//               >
//                 Email
//               </label>
//               <input
//                 id="email"
//                 type="email"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 required
//                 autoComplete="email"
//                 className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
//                 placeholder="you@example.com"
//               />
//             </div>
//             {error && (
//               <p className="text-sm text-red-600 dark:text-red-400" role="alert">
//                 {error}
//               </p>
//             )}
//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
//             >
//               {loading ? 'Sending…' : 'Send link'}
//             </button>
//           </form>
//           <p className="text-center text-sm text-gray-600 dark:text-gray-400">
//             Already have an account?{' '}
//             <Link
//               href="/login"
//               className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
//             >
//               Log in
//             </Link>
//           </p>
//         </div>
//       </main>
//     </div>
//   )
// }

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Create profile as pending approval
    await supabase.from('profiles').insert({
      id: data.user?.id,
      role: null,
      status: 'pending',
    })

    setLoading(false)
    router.push('/pending-approval')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-xl font-semibold">HRM</h1>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-center">Create account</h2>
            <p className="mt-1 text-sm text-center text-gray-500">
              Your account will be reviewed by admin before access is granted.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border px-3 py-2 rounded-md"
            />

            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border px-3 py-2 rounded-md"
            />

            <input
              type="password"
              placeholder="Confirm Password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border px-3 py-2 rounded-md"
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-md"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm">
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
