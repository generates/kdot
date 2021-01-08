import path from 'path'
import { createRequire } from 'module'
import { test } from '@ianwalter/bff'
import configure from '../lib/configure.js'

const require = createRequire(import.meta.url)
const packageJson = require('../example/package.json')

const input = {
  base: packageJson.kdot,
  custom: path.resolve('example/k.custom.js')
}

test('Configure • Example', async t => {
  const cfg = await configure(input)
  t.logger.info(cfg)
  t.expect(cfg.namespace).toBe('kendrick')
})
