import { createLogger } from '@generates/logger'
import { env } from '../loadEnv.js'

const logger = createLogger({ namespace: 'kdot.env', level: 'info' })

export default function configureEnv (app) {
  // Use key-values in the env map namespaced by the app name or fallback to
  // the root env map.
  const appEnv = env[app.name] || env

  app.env = Object.entries(app.env).map(([name, value]) => {
    if (value.env) {
      // If an "env" key is specified, try to get the value from the
      // environment variable or from the env map.
      const envValue = process.env[value.env] || appEnv[value.env]

      logger.debug('Env', { name, value, envValue })

      return { name, value: envValue }
    } else if (typeof value === 'object') {
      // If the value is an object, configure it to be derived from some other
      // source (e.g. a secret).
      return { name, valueFrom: value }
    }

    // Return the env config as an object.
    return { name, value }
  })
}
