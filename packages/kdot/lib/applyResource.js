import { createLogger } from '@generates/logger'
import { core, apps, net, sched, rbac } from './k8sApi.js'
import getRunningPod from './getRunningPod.js'

const logger = createLogger({ namespace: 'kdot.apply', level: 'info' })

export default async function applyResource ({ app, ...resource }, opts = {}) {
  const { logLevel = 'fatal' } = opts
  const { uid, name, namespace } = resource.metadata
  try {
    if (resource.kind === 'Namespace') {
      if (!uid) {
        await core.createNamespace(resource)
        logger.success('Created Namespace:', name)
      }
    } else if (resource.kind === 'Deployment') {
      // If the app depends on other apps, wait for the other apps to have
      // running pods before creating the dependent app's Deployment.
      if (app.dependsOn?.length) {
        const toWait = name => getRunningPod(namespace, name, { interval: 999 })
        await Promise.all(app.dependsOn.map(toWait))
      }

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
    } else if (resource.kind === 'PriorityClass') {
      await sched.createPriorityClass(resource)
      logger.success('Created PriorityClass:', name)
    } else if (resource.kind === 'Role') {
      if (uid) {
        await rbac.patchNamespacedRole(
          name,
          namespace,
          resource,
          undefined,
          undefined,
          undefined,
          undefined,
          { headers: { 'Content-Type': 'application/merge-patch+json' } }
        )
        logger.success('Updated Role:', name)
      } else {
        await rbac.createNamespacedRole(namespace, resource)
        logger.success('Created Role:', name)
      }
    } else if (resource.kind === 'ClusterRole') {
      if (uid) {
        await rbac.patchClusterRole(
          name,
          resource,
          undefined,
          undefined,
          undefined,
          undefined,
          { headers: { 'Content-Type': 'application/merge-patch+json' } }
        )
        logger.success('Updated ClusterRole:', name)
      } else {
        await rbac.createClusterRole(resource)
        logger.success('Created ClusterRole:', name)
      }
    } else if (resource.kind === 'ServiceAccount') {
      if (uid) {
        await core.patchNamespacedServiceAccount(
          name,
          namespace,
          resource,
          undefined,
          undefined,
          undefined,
          undefined,
          { headers: { 'Content-Type': 'application/merge-patch+json' } }
        )
        logger.success('Updated ServiceAccount:', name)
      } else {
        await core.createNamespacedServiceAccount(resource)
        logger.success('Created ServiceAccount:', name)
      }
    } else if (resource.kind === 'RoleBinding') {
      if (uid) {
        await rbac.patchNamespacedRoleBinding(
          name,
          namespace,
          resource,
          undefined,
          undefined,
          undefined,
          undefined,
          { headers: { 'Content-Type': 'application/merge-patch+json' } }
        )
        logger.success('Updated RoleBinding:', name)
      } else {
        await rbac.createNamespacedRoleBinding(resource)
        logger.success('Created RoleBinding:', name)
      }
    } else if (resource.kind === 'ClusterRoleBinding') {
      if (uid) {
        await rbac.patchClusterRoleBinding(
          name,
          resource,
          undefined,
          undefined,
          undefined,
          undefined,
          { headers: { 'Content-Type': 'application/merge-patch+json' } }
        )
        logger.success('Updated ClusterRoleBinding:', name)
      } else {
        await rbac.createClusterRoleBinding(resource)
        logger.success('Created ClusterRoleBinding:', name)
      }
    } else if (resource.kind === 'Pod') {
      const pod = await core.createNamespacedPod(namespace, resource)
      logger.success('Created Pod:', name)
      return pod
    }
  } catch (err) {
    logger[logLevel](`Failed to apply ${resource.kind}:`, name)
    logger.error(err.response?.body?.message || err)
    if (logLevel === 'fatal') process.exit(1)
  }
}
