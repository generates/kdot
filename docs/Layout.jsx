import React from 'react'
import Docs from '@generates/skrt/lib/layouts/Docs.jsx'

export default function Layout (props) {
  const head = (
    <script
      async
      defer
      data-domain="kdot.generates.io"
      src="https://plausible.io/js/plausible.js"
    />
  )
  return <Docs {...props} head={head} />
}
