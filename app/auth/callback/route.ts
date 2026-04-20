import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    // No code means something went wrong with the magic link
    return NextResponse.redirect(`${origin}/signup?error=missing_code`)
  }

  const supabase = await createClient()

  // Exchange the one-time code for a session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/signup?error=auth_failed`)
  }

  const user = data.user

  // Check if this supplier already has a row (i.e. they've logged in before)
  const { data: existingSupplier } = await supabase
    .from('suppliers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!existingSupplier) {
    // First time — create their supplier row using the metadata they submitted at signup
    const businessName = user.user_metadata?.business_name ?? 'My Store'
    const suburb = user.user_metadata?.suburb ?? ''

    // Generate a URL-safe slug from business name + 4 random chars to avoid collisions
    const baseSlug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`

    const { error: insertError } = await supabase.from('suppliers').insert({
      user_id: user.id,
      business_name: businessName,
      suburb: suburb,
      slug: slug,
      email: user.email,
    })

    if (insertError) {
      // Log it but don't block — they're authenticated, just the row failed
      console.error('Failed to create supplier row:', insertError.message)
      return NextResponse.redirect(`${origin}/dashboard?setup_error=1`)
    }
  }

  // All good — send them to the dashboard
  return NextResponse.redirect(`${origin}/dashboard`)
}
