import 'dotenv/config.js'
import { createLogger } from '@generates/logger'
import { oneLine } from 'common-tags'

const logger = createLogger({ namespace: 'kdot.configure', level: 'info' })

export default function configureSecrets (opts) {
  const secrets = []

  for (const given of opts.secrets) {
    const metadata = { name: given.name || opts.name }
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
            secret.data[value] = envValue
            const secretKeyRef = { name: secret.name, key: value }
            if (opts.env) {
              opts.env.push({ name: value, valueFrom: { secretKeyRef } })
            }
          } else {
            logger.warn(oneLine`
              Not adding "${value}" to secret "${metadata.name}" because it's
              undefined
            `)
          }
        } else if (typeof value === 'object') {
          for (const [secretKey, envKey] of Object.entries(value)) {
            const envValue = process.env[envKey]
            if (envValue) {
              addSecret = true
              secret.data[secretKey] = envValue
              const secretKeyRef = { name: secret.name, key: secretKey }
              if (opts.env) {
                opts.env.push({ name: secretKey, valueFrom: { secretKeyRef } })
              }
            } else {
              logger.warn(oneLine`
                Not adding "${envKey}" to secret "${metadata.name}" because it's
                undefined
              `)
            }
          }
        }
      }
    }

    // Specifying secrets with keys will allow top-level secrets to be
    // used by apps as environment variables.
    if (opts.name && given.keys) {
      for (const key of given.keys) {
        if (typeof key === 'string') {
          const valueFrom = { secretKeyRef: { name: secret.name, key } }
          if (opts.env) opts.env.push({ name: key, valueFrom })
        } else if (typeof key === 'object') {
          for (const [secretKey, envKey] of Object.entries(key)) {
            const secretKeyRef = { name: secret.name, key: secretKey }
            if (opts.env) {
              opts.env.push({ name: envKey, valueFrom: { secretKeyRef } })
            }
          }
        }
      }
    }

    // Add the secret if it's a secret that may need to be created and is
    // not just referencing a top-level secret.
    if (addSecret) secrets.push(secret)
  }

  return secrets
}
