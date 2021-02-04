import { createLogger } from '@generates/logger'
import { k8s } from './k8s.js'
import getRunningPod from './getRunningPod.js'

const logger = createLogger({ namespace: 'kdot.apply', level: 'info' })

export default async function applyResource ({ app, ...resource }, opts = {}) {
  const { logLevel = 'fatal' } = opts
  const { uid, namespace, name } = resource.metadata
  try {
    // If the app depends on other apps, wait for the other apps to have
    // running pods before creating the dependent app's Deployment.
    if (resource.kind === 'Deployment' && app?.dependsOn?.length) {
      const toWait = name => getRunningPod(namespace, name, { interval: 999 })
      await Promise.all(app.dependsOn.map(toWait))
    }

    if (uid) {
      await k8s.client.patch(resource)
      logger.success(`Updated ${resource.kind}:`, name)
    } else {
      await k8s.client.create(resource)
      logger.success(`Created ${resource.kind}:`, name)
    }
  } catch (err) {
    logger[logLevel](`Failed to apply ${resource.kind}:`, name)
    logger.error(err.response?.body?.message || err)
    if (logLevel === 'fatal') process.exit(1)
  }
}
