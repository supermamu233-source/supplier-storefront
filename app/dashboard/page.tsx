import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CopyButton from './CopyButton'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get the logged-in user — redirect to login if no session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch their supplier profile
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id, business_name, slug')
    .eq('user_id', user.id)
    .single()

  if (!supplier) redirect('/login')

  // Fetch their products
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, unit, in_stock, image_url')
    .eq('supplier_id', supplier.id)
    .order('display_order', { ascending: true })

  const storefrontUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/s/${supplier.slug}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-semibold text-gray-900">{supplier.business_name}</span>
          <Link
            href="/dashboard/products/new"
            className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            + Add product
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Storefront link card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-500 mb-1">Your public storefront</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-gray-900 font-mono text-sm break-all">{storefrontUrl}</span>
            <CopyButton text={storefrontUrl} />
          </div>
        </div>

        {/* Products section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Products</h2>

          {!products || products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500 mb-4">No products yet.</p>
              <Link
                href="/dashboard/products/new"
                className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Add your first product
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
              {products.map((product) => (
                <div key={product.id} className="flex items-center gap-4 px-6 py-4">
                  {/* Product image thumbnail */}
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0" />
                  )}

                  {/* Name + status */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-sm text-gray-500">
                      {product.price != null ? `$${product.price} / ${product.unit}` : 'POA'}
                    </p>
                  </div>

                  {/* Stock badge */}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    product.in_stock
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {product.in_stock ? 'In stock' : 'Out of stock'}
                  </span>

                  {/* Edit link */}
                  <Link
                    href={`/dashboard/products/${product.id}`}
                    className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
