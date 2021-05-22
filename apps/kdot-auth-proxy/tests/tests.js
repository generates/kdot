import { test } from '@ianwalter/bff'
import { requester } from '@ianwalter/requester'

test.skip('GET request', async t => {
  const response = await requester.get('http://localhost:3004')
  t.expect(response.status).toBe(200)
})
