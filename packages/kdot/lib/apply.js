import { createLogger } from '@generates/logger'
import { core, apps, net } from './k8sApi.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })

/**
 * Add configured apps to the cluster.
 */
export default async function apply (cfg) {
  for (const resource of cfg.resources.all) {
    const { uid, name, namespace } = resource.metadata
    try {
      if (resource.kind === 'Namespace') {
        if (!uid) {
          await core.createNamespace(resource)
          logger.success('Created Namespace:', name)
        }
      } else if (resource.kind === 'Deployment') {
        if (uid) {
          await apps.patchNamespacedDeployment(
            name,
            namespace,
            resource,
            undefined,
            undefined,
            undefined,
            undefined,
            { headers: { 'Content-Type': 'application/merge-patch+json' } }
          )
          logger.success('Updated Deployment:', name)
        } else {
          await apps.createNamespacedDeployment(namespace, resource)
          logger.success('Created Deployment:', name)
        }
      } else if (resource.kind === 'Service') {
        if (uid) {
          await core.patchNamespacedService(
            name,
            namespace,
            resource,
            undefined,
            undefined,
            undefined,
            undefined,
            { headers: { 'Content-Type': 'application/merge-patch+json' } }
          )
          logger.success('Updated Service:', name)
        } else {
          await core.createNamespacedService(namespace, resource)
          logger.success('Created Service:', name)
        }
      } else if (resource.kind === 'Secret') {
        if (uid) {
          await core.patchNamespacedSecret(
            name,
            namespace,
            resource,
            undefined,
            undefined,
            undefined,
            undefined,
            { headers: { 'Content-Type': 'application/merge-patch+json' } }
          )
          logger.success('Updated Secret:', name)
        } else {
          await core.createNamespacedSecret(namespace, resource)
          logger.success('Created Secret:', name)
        }
      } else if (resource.kind === 'Ingress') {
        if (uid) {
          await net.patchNamespacedIngress(
            name,
            namespace,
            resource,
            undefined,
            undefined,
            undefined,
            undefined,
            { headers: { 'Content-Type': 'application/merge-patch+json' } }
          )
          logger.success('Updated Ingress:', name)
        } else {
          await net.createNamespacedIngress(namespace, resource)
          logger.success('Created Ingress:', name)
        }
      } else if (resource.kind === 'ConfigMap') {
        if (uid) {
          await core.patchNamespacedConfigMap(
            name,
            namespace,
            resource,
            undefined,
            undefined,
            undefined,
            undefined,
            { headers: { 'Content-Type': 'application/merge-patch+json' } }
          )
          logger.success('Updated ConfigMap:', name)
        } else {
          await core.createNamespacedConfigMap(namespace, resource)
          logger.success('Created ConfigMap:', name)
        }
      }
    } catch (err) {
      const level = cfg.input.failFast ? 'fatal' : 'error'
      logger[level](`Failed to apply ${resource.kind}:`, name)
      logger.error(err.response?.body?.message || err)
      if (level === 'fatal') process.exit(1)
    }
  }
}
