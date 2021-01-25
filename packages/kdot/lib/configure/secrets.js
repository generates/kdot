import 'dotenv/config.js'
import { createLogger } from '@generates/logger'
import { oneLine } from 'common-tags'

const logger = createLogger({ namespace: 'kdot.configure', level: 'info' })

function encode (value) {
  const buffer = Buffer.from(value)
  return buffer.toString('base64')
}

export default function configureSecrets (cfg, owner) {
  // Determine which Secrets to configure and which namespace to use (top-level
  // or app-level),
  const secrets = owner?.secrets || cfg.secrets
  const namespace = owner?.namespace || cfg.namespace

  // Create an array of configured Secrets if it doesn't exist.
  cfg.resources.secrets = cfg.resources.secrets || []

  // Create the app env property if it doesn't exist so that the secrets can
  // be made available to the app as environment variables.
  if (owner) owner.env = owner.env || {}

  for (const given of secrets) {
    const name = given.name || owner.name
    const secret = {
      app: owner,
      kind: 'Secret',
      metadata: { namespace, name },
      data: {}
    }

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
            const secretKeyRef = { name, key: value }
            if (owner?.env) owner.env[value] = { secretKeyRef }
          } else {
            logger.debug(oneLine`
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
              if (owner?.env) owner.env[secretKey] = { secretKeyRef }
            } else {
              logger.debug(oneLine`
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
    if (owner?.env && given.keys) {
      for (const key of given.keys) {
        if (typeof key === 'string') {
          owner.env[key] = { secretKeyRef: { name, key } }
        } else if (typeof key === 'object') {
          for (const [envKey, secretKey] of Object.entries(key)) {
            owner.env[envKey] = { secretKeyRef: { name, key: secretKey } }
          }
        }
      }
    }

    // Add the secret if it's a secret that may need to be created and is
    // not just referencing a top-level secret.
    if (addSecret) cfg.resources.secrets.push(secret)
  }
}
