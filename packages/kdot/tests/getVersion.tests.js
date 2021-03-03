import { test } from '@ianwalter/bff'
import getVersion from '../lib/getVersion.js'

test('getVersion', async t => {
  t.expect(await getVersion('../package.json')).toBeDefined()
})
