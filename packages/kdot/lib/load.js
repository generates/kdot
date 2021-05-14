import path from 'path'
import { createRequire } from 'module'
import { merge } from '@generates/merger'
import { createLogger } from '@generates/logger'
import { loadEnv } from './loadEnv.js'

const require = createRequire(import.meta.url)
const logger = createLogger({ namespace: 'kdot.load', level: 'info' })

export default async function load (...configs) {
  const cfg = {}

  await Promise.all(configs.map(async config => {
    const dirname = path.dirname(config)
    const basename = path.basename(config)
    const hasExt = basename.includes('.')

    // Load the .env file values for the config's directory.
    cfg.envNs = basename.replaceAll('.', '')
    await loadEnv(dirname, cfg.envNs)

    try {
      let js = path.resolve(dirname, `k.${basename}.js`)
      if (hasExt) js = path.resolve(config)
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
      let json = path.resolve(dirname, `k.${basename}.json`)
      if (hasExt) {
        const jsonBasename = basename.replace(path.extname(basename), '.json')
        json = path.resolve(dirname, jsonBasename)
      }
      merge(cfg, require(json))
    } catch (err) {
      logger.debug('Error importing json config file', err)
    }
  }))

  logger.debug('Loaded configuration', cfg)

  return cfg
}
