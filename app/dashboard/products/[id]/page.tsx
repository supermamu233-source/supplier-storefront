'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400 bg-white'

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  const supabase = createClient()

  const [name, setName] = useState('')
  const [nameCn, setNameCn] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('')
  const [category, setCategory] = useState('')
  const [inStock, setInStock] = useState(true)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Load existing product data on mount
  useEffect(() => {
    async function loadProduct() {
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (fetchError || !product) {
        setError('Product not found.')
        setFetching(false)
        return
      }

      setName(product.name ?? '')
      setNameCn(product.name_cn ?? '')
      setDescription(product.description ?? '')
      setPrice(product.price != null ? String(product.price) : '')
      setUnit(product.unit ?? '')
      setCategory(product.category ?? '')
      setInStock(product.in_stock ?? true)
      setExistingImageUrl(product.image_url ?? null)
      setFetching(false)
    }

    loadProduct()
  }, [productId])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Upload new image if one was chosen
    let imageUrl = existingImageUrl
    if (imageFile) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not logged in.')
        setLoading(false)
        return
      }

      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!supplier) {
        setError('Could not find your supplier account.')
        setLoading(false)
        return
      }

      const fileExt = imageFile.name.split('.').pop()
      const filePath = `${supplier.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, imageFile)

      if (uploadError) {
        setError(`Image upload failed: ${uploadError.message}`)
        setLoading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath)

      imageUrl = urlData.publicUrl
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({
        name: name.trim(),
        ...(nameCn.trim() ? { name_cn: nameCn.trim() } : { name_cn: null }),
        description: description.trim() || null,
        price: price.trim() !== '' ? parseFloat(price) : null,
        unit: unit.trim(),
        category: category.trim() || null,
        image_url: imageUrl,
        in_stock: inStock,
      })
      .eq('id', productId)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  async function handleDelete() {
    setLoading(true)

    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)

    if (deleteError) {
      setError(deleteError.message)
      setLoading(false)
      setShowDeleteConfirm(false)
      return
    }

    router.push('/dashboard')
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-700 transition-colors">
            ← Back
          </Link>
          <h1 className="font-semibold text-gray-900">Edit product</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">

          {/* Photo upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo
            </label>
            <div className="flex items-center gap-4">
              {/* Show new preview if chosen, otherwise existing image */}
              {imagePreview || existingImageUrl ? (
                <img
                  src={imagePreview ?? existingImageUrl!}
                  alt="Product"
                  className="w-24 h-24 rounded-xl object-cover border border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                  No photo
                </div>
              )}
              <label className="cursor-pointer text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                {existingImageUrl ? 'Change photo' : 'Choose photo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Chinese name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chinese name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={nameCn}
              onChange={(e) => setNameCn(e.target.value)}
              className={inputClass}
              placeholder="e.g. 芥蘭"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
              placeholder="e.g. Vegetables"
            />
          </div>

          {/* Price + Unit */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price <span className="text-gray-400 font-normal">(leave blank for POA)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={`${inputClass} pl-7`}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={inputClass}
                placeholder="e.g. kg, box, bunch"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Any extra details buyers should know"
            />
          </div>

          {/* In stock toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-gray-700">In stock</p>
              <p className="text-xs text-gray-400">Hidden from buyers when turned off</p>
            </div>
            <button
              type="button"
              onClick={() => setInStock(!inStock)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                inStock ? 'bg-emerald-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  inStock ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving...' : 'Save changes'}
          </button>
        </form>

        {/* Delete — separate from the form so it can't be triggered by accident */}
        <div className="mt-4">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              Delete product
            </button>
          ) : (
            <div className="bg-white rounded-2xl border border-red-200 p-5 text-center space-y-3">
              <p className="text-sm text-gray-700 font-medium">Delete this product?</p>
              <p className="text-xs text-gray-400">This can't be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Deleting...' : 'Yes, delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
