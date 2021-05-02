import 'dotenv/config.js'

import path from 'path'
import { createRequire } from 'module'
import { merge } from '@generates/merger'
import { createLogger } from '@generates/logger'
import { loadEnv } from './loadEnv.js'

const require = createRequire(import.meta.url)
const logger = createLogger({ namespace: 'kdot.cfg', level: 'info' })

export default async function load (...configs) {
  const cfg = {}

  for (const config of configs) {
    const dirname = path.dirname(config)
    const basename = path.basename(config)
    const js = path.resolve(dirname, `k.${basename}.js`)
    const json = path.resolve(dirname, `k.${basename}.json`)

    try {
      const mod = await import(js)
      if (typeof mod.default === 'function') {
        await mod.default(cfg)
      } else {
        merge(cfg, mod.default)
      }
    } catch (err) {
      logger.error('Error importing config file', err)
    }

    try {
      merge(cfg, require(json))
    } catch (err) {
      logger.debug('Error importing json config file', err)
    }

    //
    await loadEnv(dirname, basename)
  }

  logger.debug('Loaded configuration', cfg)

  return cfg
}
