'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// Separated into its own component because useSearchParams() requires Suspense
function SignupForm() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const callbackError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [suburb, setSuburb] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: {
          business_name: businessName,
          suburb: suburb,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (otpError) {
      setError(otpError.message)
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="text-4xl mb-4">📬</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-gray-600">
          We sent a magic link to <strong>{email}</strong>. Click it to activate your account.
        </p>
        <p className="text-gray-400 text-sm mt-4">
          No email? Check your spam folder, or{' '}
          <button onClick={() => setSubmitted(false)} className="text-emerald-600 underline">
            try again
          </button>
          .
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Create your store</h1>
      <p className="text-gray-600 mb-6">
        Get a digital catalog your customers can browse and order from.
      </p>

      {callbackError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {callbackError === 'missing_code' && 'The magic link was invalid or expired. Please request a new one.'}
          {callbackError === 'auth_failed' && "Login failed. This usually means the redirect URL isn't configured in Supabase."}
          {callbackError !== 'missing_code' && callbackError !== 'auth_failed' && `Error: ${callbackError}`}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business name</label>
          <input
            type="text"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-gray-900"
            placeholder="e.g. Cabramatta Fresh Produce"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Suburb</label>
          <input
            type="text"
            required
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-gray-900"
            placeholder="e.g. Cabramatta"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-gray-900"
            placeholder="you@yourbusiness.com"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Sending link...' : 'Create store'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-emerald-600 font-medium">
          Log in
        </Link>
      </p>
    </div>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Suspense fallback={<div className="text-gray-400">Loading...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  )
}
