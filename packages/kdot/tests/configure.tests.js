import { test } from '@ianwalter/bff'
import configure from '../lib/configure/index.js'

const input = { config: ['example'] }

test('Configure • Example', async t => {
  const cfg = await configure(input)
  await t.logger.info(cfg)
  t.expect(cfg.namespace).toBe('dev')
  t.expect(cfg.apps.web.env.find(e => e.name === 'APP_ENV')).toBeDefined()
})
