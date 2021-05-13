import path from 'path'
import { createRequire } from 'module'
import { merge } from '@generates/merger'
import { createLogger } from '@generates/logger'
import { loadEnv } from './loadEnv.js'

const require = createRequire(import.meta.url)
const logger = createLogger({ namespace: 'kdot.load', level: 'info' })

export default async function load (...configs) {
  const cfg = {}

  for (const config of configs) {
    const dirname = path.dirname(config)
    const basename = path.basename(config)

    // Load the .env file values for the config's directory.
    await loadEnv(dirname, basename)

    try {
      let js = path.resolve(dirname, `k.${basename}.js`)
      if (basename.includes('.')) js = path.resolve(config)
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
      const json = path.resolve(dirname, `k.${basename}.json`)
      merge(cfg, require(json))
    } catch (err) {
      logger.debug('Error importing json config file', err)
    }
  }

  logger.debug('Loaded configuration', cfg)

  return cfg
}
