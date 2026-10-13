'use client'

import { Comments as CommentsComponent } from 'pliny/comments'
import { useState } from 'react'
import siteMetadata from '@/data/siteMetadata'
import { commentsEnabled } from '@/lib/commentsEnabled'

export default function Comments({ slug }: { slug: string }) {
  const [loadComments, setLoadComments] = useState(false)

  // The siteMetadata.comments check is redundant with commentsEnabled at runtime
  // (commentsEnabled already requires it); it's here so TypeScript can narrow
  // siteMetadata.comments as defined below.
  if (!commentsEnabled || !siteMetadata.comments) {
    return null
  }
  return (
    <>
      {loadComments ? (
        <CommentsComponent commentsConfig={siteMetadata.comments} slug={slug} />
      ) : (
        <button onClick={() => setLoadComments(true)}>Load Comments</button>
      )}
    </>
  )
}
