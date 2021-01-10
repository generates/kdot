import 'dotenv/config.js'
import { createLogger } from '@generates/logger'
import { oneLine } from 'common-tags'

const logger = createLogger({ namespace: 'kdot.configure', level: 'info' })

function encode (value) {
  const buffer = Buffer.from(value)
  return buffer.toString('base64')
}

export default function configureSecrets (item, isApp) {
  const secrets = []
  const env = isApp ? (item.env || {}) : null

  if (item.secrets) {
    for (const given of item.secrets) {
      const name = given.name || item.name
      const metadata = { namespace: item.namespace, name }
      const secret = { kind: 'Secret', metadata, data: {} }

      // Specifying secrets with values will queue those secrets to be
      // created if they don't exist and be used by apps as environment
      // variables.
      let addSecret = false
      if (given.values) {
        for (const value of given.values) {
          if (typeof value === 'string') {
            const envValue = process.env[value]
            if (envValue) {
              addSecret = true
              secret.data[value] = encode(envValue)
              if (env) env[value] = { secretKeyRef: { name, key: value } }
            } else {
              logger.warn(oneLine`
                Not adding "${value}" to secret "${name}" because it's undefined
              `)
            }
          } else if (typeof value === 'object') {
            for (const [secretKey, envKey] of Object.entries(value)) {
              const envValue = process.env[envKey]
              if (envValue) {
                addSecret = true
                secret.data[secretKey] = encode(envValue)
                const secretKeyRef = { name, key: secretKey }
                if (env) env[secretKey] = { secretKeyRef }
              } else {
                logger.warn(oneLine`
                  Not adding "${envKey}" to secret "${name}" because it's
                  undefined
                `)
              }
            }
          }
        }
      }

      // Specifying secrets with keys will allow top-level secrets to be
      // used by apps as environment variables.
      if (isApp && given.keys) {
        for (const key of given.keys) {
          if (typeof key === 'string') {
            if (env) env[key] = { secretKeyRef: { name, key } }
          } else if (typeof key === 'object') {
            for (const [envKey, secretKey] of Object.entries(key)) {
              if (env) env[envKey] = { secretKeyRef: { name, key: secretKey } }
            }
          }
        }
      }

      // Add the secret if it's a secret that may need to be created and is
      // not just referencing a top-level secret.
      if (addSecret) secrets.push(secret)
    }
  }

  if (env?.lenth) item.env = env

  return secrets
}
