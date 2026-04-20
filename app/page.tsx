import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-sm p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Orderly</h1>
        <p className="text-gray-600 mb-6">Create and share a digital supplier storefront.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/signup" className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium">
            Create store
          </Link>
          <Link href="/login" className="border border-gray-300 px-5 py-2.5 rounded-lg font-medium">
            Log in
          </Link>
        </div>
      </div>
    </main>
  )
}
