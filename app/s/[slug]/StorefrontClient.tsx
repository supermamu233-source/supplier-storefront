'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Product {
  id: string
  name: string
  description: string | null
  price: number | null
  unit: string
  category: string | null
  image_url: string | null
  in_stock: boolean
}

interface Supplier {
  id: string
  business_name: string
  description: string | null
  suburb: string | null
  phone: string | null
  whatsapp: string | null
}

interface CartItem {
  product: Product
  quantity: number
}

interface Props {
  supplier: Supplier
  products: Product[]
}

export default function StorefrontClient({ supplier, products }: Props) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)

  // Buyer checkout form state
  const [buyerName, setBuyerName] = useState('')
  const [buyerBusiness, setBuyerBusiness] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerAddress, setBuyerAddress] = useState('')
  const [buyerNotes, setBuyerNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Derive unique categories from products
  const categories = useMemo(() => {
    const cats = products
      .map((p) => p.category)
      .filter((c): c is string => c !== null && c !== '')
    return Array.from(new Set(cats))
  }, [products])

  // Filter products by search + category
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        search.trim() === '' ||
        p.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory =
        activeCategory === null || p.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [products, search, activeCategory])

  // Cart helpers
  function getQty(productId: string) {
    return cart.find((item) => item.product.id === productId)?.quantity ?? 0
  }

  function setQty(product: Product, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== product.id))
    } else {
      setCart((prev) => {
        const existing = prev.find((item) => item.product.id === product.id)
        if (existing) {
          return prev.map((item) =>
            item.product.id === product.id ? { ...item, quantity: qty } : item
          )
        }
        return [...prev, { product, quantity: qty }]
      })
    }
  }

  const cartTotal = cart.reduce((sum, item) => {
    return sum + (item.product.price ?? 0) * item.quantity
  }, 0)

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Build the WhatsApp message
  function buildWhatsAppMessage() {
    const lines = [
      `*New Order — ${supplier.business_name}*`,
      '',
      `*Buyer:* ${buyerName}`,
      buyerBusiness ? `*Business:* ${buyerBusiness}` : null,
      `*Phone:* ${buyerPhone}`,
      buyerAddress ? `*Address:* ${buyerAddress}` : null,
      buyerNotes ? `*Notes:* ${buyerNotes}` : null,
      '',
      '*Items:*',
      ...cart.map(
        (item) =>
          `• ${item.product.name} × ${item.quantity} ${item.product.unit}` +
          (item.product.price != null
            ? ` = $${(item.product.price * item.quantity).toFixed(2)}`
            : ' (POA)')
      ),
      '',
      cartTotal > 0 ? `*Total: $${cartTotal.toFixed(2)}*` : '*Total: TBC (some items are POA)*',
    ]
      .filter((l) => l !== null)
      .join('\n')

    return encodeURIComponent(lines)
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')

    const supabase = createClient()

    const total = cartTotal

    // Save order to database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        supplier_id: supplier.id,
        buyer_name: buyerName.trim(),
        buyer_business: buyerBusiness.trim() || null,
        buyer_phone: buyerPhone.trim(),
        buyer_address: buyerAddress.trim() || null,
        buyer_notes: buyerNotes.trim() || null,
        total_amount: total > 0 ? total : null,
        status: 'new',
      })
      .select('id')
      .single()

    if (orderError || !order) {
      setSubmitError(`Failed to submit order: ${orderError?.message ?? 'unknown error'}`)
      setSubmitting(false)
      return
    }

    // Save order lines
    const lines = cart.map((item) => ({
      order_id: order.id,
      product_id: item.product.id,
      product_name: item.product.name,
      product_unit: item.product.unit,
      unit_price: item.product.price,
      quantity: item.quantity,
      line_total: item.product.price != null ? item.product.price * item.quantity : null,
    }))

    await supabase.from('order_lines').insert(lines)

    // Open WhatsApp deep link
    const waNumber = (supplier.whatsapp ?? supplier.phone ?? '').replace(/\D/g, '')
    const message = buildWhatsAppMessage()
    const waUrl = `https://wa.me/${waNumber}?text=${message}`
    window.open(waUrl, '_blank')

    setSubmitted(true)
    setSubmitting(false)
  }

  // --- Checkout screen ---
  if (showCheckout) {
    if (submitted) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Order sent!</h2>
            <p className="text-gray-600 text-sm">
              Your order has been saved and WhatsApp has been opened. The supplier will contact you to confirm.
            </p>
            <button
              onClick={() => {
                setSubmitted(false)
                setShowCheckout(false)
                setShowCart(false)
                setCart([])
              }}
              className="mt-6 w-full py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
            >
              Back to store
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => setShowCheckout(false)}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              ← Back
            </button>
            <h1 className="font-semibold text-gray-900">Your details</h1>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {/* Order summary */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700 mb-3">Order summary</p>
            {cart.map((item) => (
              <div key={item.product.id} className="flex justify-between text-sm text-gray-700">
                <span>{item.product.name} × {item.quantity} {item.product.unit}</span>
                <span>
                  {item.product.price != null
                    ? `$${(item.product.price * item.quantity).toFixed(2)}`
                    : 'POA'}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 flex justify-between font-medium text-gray-900">
              <span>Total</span>
              <span>{cartTotal > 0 ? `$${cartTotal.toFixed(2)}` : 'TBC'}</span>
            </div>
          </div>

          {/* Buyer details form */}
          <form onSubmit={handleCheckout} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                placeholder="e.g. David Chen"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={buyerBusiness}
                onChange={(e) => setBuyerBusiness(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                placeholder="e.g. Dragon Palace Restaurant"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                placeholder="e.g. 0412 345 678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery address <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                placeholder="e.g. 12 Market St, Cabramatta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={buyerNotes}
                onChange={(e) => setBuyerNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 resize-none"
                placeholder="Delivery instructions, special requests..."
              />
            </div>

            {submitError && (
              <p className="text-red-600 text-sm">{submitError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Sending...' : 'Send order via WhatsApp'}
            </button>
            <p className="text-xs text-gray-400 text-center">
              This will open WhatsApp with a pre-filled message to the supplier.
            </p>
          </form>
        </main>
      </div>
    )
  }

  // --- Cart drawer ---
  if (showCart) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => setShowCart(false)}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              ← Back
            </button>
            <h1 className="font-semibold text-gray-900">Your cart</h1>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6 space-y-3">
          {cart.map((item) => (
            <div key={item.product.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
              {item.product.image_url && (
                <img
                  src={item.product.image_url}
                  alt={item.product.name}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{item.product.name}</p>
                <p className="text-sm text-gray-500">
                  {item.product.price != null
                    ? `$${item.product.price} / ${item.product.unit}`
                    : `POA / ${item.product.unit}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setQty(item.product, item.quantity - 1)}
                  className="w-8 h-8 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg leading-none"
                >
                  −
                </button>
                <span className="w-6 text-center text-gray-900 font-medium">{item.quantity}</span>
                <button
                  onClick={() => setQty(item.product, item.quantity + 1)}
                  className="w-8 h-8 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center text-lg leading-none"
                >
                  +
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <p className="text-center text-gray-400 py-12">Your cart is empty.</p>
          )}

          {cart.length > 0 && (
            <div className="pt-4">
              <div className="flex justify-between text-gray-900 font-semibold mb-4 px-1">
                <span>Total</span>
                <span>{cartTotal > 0 ? `$${cartTotal.toFixed(2)}` : 'TBC (includes POA items)'}</span>
              </div>
              <button
                onClick={() => setShowCheckout(true)}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
              >
                Proceed to checkout
              </button>
            </div>
          )}
        </main>
      </div>
    )
  }

  // --- Main storefront ---
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-tight">{supplier.business_name}</h1>
            {supplier.suburb && (
              <p className="text-xs text-gray-400">{supplier.suburb}</p>
            )}
          </div>
          {cartCount > 0 && (
            <button
              onClick={() => setShowCart(true)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              Cart
              <span className="bg-white text-emerald-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full px-4 py-2 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
          />
        </div>

        {/* Category pills */}
        {categories.length > 0 && (
          <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveCategory(null)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                activeCategory === null
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Product grid */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-16">No products found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((product) => {
              const qty = getQty(product.id)
              return (
                <div key={product.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
                  {/* Product image */}
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gray-100" />
                  )}

                  {/* Product info */}
                  <div className="p-3 flex flex-col flex-1">
                    <p className="font-medium text-gray-900 text-sm leading-snug mb-1">{product.name}</p>
                    <p className="text-xs text-gray-500 mb-3">
                      {product.price != null
                        ? `$${product.price} / ${product.unit}`
                        : `POA / ${product.unit}`}
                    </p>

                    {/* Add to cart / quantity control */}
                    <div className="mt-auto">
                      {qty === 0 ? (
                        <button
                          onClick={() => setQty(product, 1)}
                          className="w-full py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                        >
                          Add
                        </button>
                      ) : (
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => setQty(product, qty - 1)}
                            className="w-8 h-8 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg leading-none"
                          >
                            −
                          </button>
                          <span className="text-gray-900 font-medium">{qty}</span>
                          <button
                            onClick={() => setQty(product, qty + 1)}
                            className="w-8 h-8 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center text-lg leading-none"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Sticky cart bar — shows at bottom when cart has items */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setShowCart(true)}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-between px-5"
            >
              <span className="bg-white text-emerald-600 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {cartCount}
              </span>
              <span>View cart</span>
              <span>{cartTotal > 0 ? `$${cartTotal.toFixed(2)}` : 'TBC'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
