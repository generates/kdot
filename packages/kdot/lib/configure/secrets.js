import { createLogger } from '@generates/logger'
import { oneLine } from 'common-tags'
import encode from '../encode.js'
import { env } from '../loadEnv.js'

const logger = createLogger({ namespace: 'kdot.cfg.secrets', level: 'info' })

export default function configureSecrets (cfg, owner) {
  // Determine which Secrets to configure and which namespace to use (top-level
  // or app-level),
  const secrets = owner?.secrets || cfg.secrets
  const namespace = owner?.namespace || cfg.namespace

  // Create the app env property if it doesn't exist so that the secrets can
  // be made available to the app as environment variables.
  if (owner) owner.env = owner.env || {}

  // Use key-values in the env map namespaced by the app name or fallback to
  // the root env map.
  const appEnv = env[owner?.name] || env

  for (const [name, given] of Object.entries(secrets)) {
    const metadata = { namespace: given.namespace || namespace, name }
    const secret = { app: owner, kind: 'Secret', metadata, data: {} }

    // Specifying secrets with values will queue those secrets to be
    // created if they don't exist and be used by apps as environment
    // variables.
    let addSecret = false
    if (given.env) {
      for (const value of given.env) {
        if (typeof value === 'string') {
          const envValue = process.env[value] || appEnv[value] || env[value]
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
            const envValue = process.env[envKey] || appEnv[envKey] || env[value]
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
    if (addSecret) cfg.resources.push(secret)
  }
}
