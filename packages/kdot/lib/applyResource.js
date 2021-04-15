import { createLogger } from '@generates/logger'
import { k8s } from './k8s.js'
import getRunningPods from './getRunningPods.js'

const logger = createLogger({ namespace: 'kdot.apply', level: 'info' })

export default async function applyResource (cfg, { app, ...resource }) {
  const logLevel = cfg.input.failFast ? 'fatal' : 'error'
  const timeout = cfg.input.timeout || 90000
  const { uid, name } = resource.metadata
  try {
    // If the app depends on other apps, wait for the other apps to have
    // running pods before creating the dependent app's Deployment.
    if (resource.kind === 'Deployment' && app?.dependsOn?.length) {
      const pollConfig = { interval: 999, limit: 1, timeout }
      await Promise.all(app.dependsOn.map(async dependencyName => {
        const { namespace, name, enabled } = cfg.apps[dependencyName] || {}

        if (!name) throw new Error(`Dependency not found: ${dependencyName}`)

        if (enabled) {
          try {
            await getRunningPods({ namespace, name, ...pollConfig })
          } catch (err) {
            if (cfg.input.failFast) {
              throw err
            } else {
              logger.error('Get running pod for dependency failed:', name, err)
            }
          }
        } else {
          logger.warn('Not waiting for disabled dependency', name)
        }
      }))
    }

    if (uid) {
      await k8s.client.patch(resource)
      logger.success(`Updated ${resource.kind}:`, name)
    } else {
      await k8s.client.create(resource)
      logger.success(`Created ${resource.kind}:`, name)
    }
  } catch (err) {
    const msg = `Failed to apply ${resource.kind}:`
    logger[logLevel](msg, name, err.response?.body || err)
    if (cfg.input.failFast) process.exit(1)
  }
}
