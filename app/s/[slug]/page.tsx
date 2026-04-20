import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StorefrontClient from './StorefrontClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function StorefrontPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch supplier by slug — publicly readable via RLS
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id, business_name, description, suburb, phone, whatsapp')
    .eq('slug', slug)
    .single()

  if (!supplier) notFound()

  // Fetch their in-stock products
  const { data: products } = await supabase
    .from('products')
    .select('id, name, description, price, unit, category, image_url, in_stock')
    .eq('supplier_id', supplier.id)
    .eq('in_stock', true)
    .order('display_order', { ascending: true })

  return (
    <StorefrontClient
      supplier={supplier}
      products={products ?? []}
    />
  )
}
