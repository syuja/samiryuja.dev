import siteMetadata from '@/data/siteMetadata'

// Single source of truth for whether comments are actually usable: a provider is
// configured AND all required Giscus env vars are present. No 'use client' here
// (it's pure data), so it resolves to the real value whether imported from a
// server component (the layouts) or a client component (Comments,
// ScrollTopAndComment) — unlike a plain value exported from a 'use client'
// module, which Next.js treats as an opaque client reference when imported by
// a server component.
export const commentsEnabled = Boolean(
  siteMetadata.comments?.provider &&
  process.env.NEXT_PUBLIC_GISCUS_REPO &&
  process.env.NEXT_PUBLIC_GISCUS_REPOSITORY_ID &&
  process.env.NEXT_PUBLIC_GISCUS_CATEGORY &&
  process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID
)
