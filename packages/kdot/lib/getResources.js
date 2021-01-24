import { createLogger } from '@generates/logger'
import { core, apps, net, sched } from './k8sApi.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })

export default async function getResources (cfg, filter = r => r) {
  const resources = []

  if (cfg.resources.namespaces.length) {
    const { body: { items } } = await core.listNamespace()
    for (const namespace of cfg.resources.namespaces) {
      const { name } = namespace.metadata
      const existing = items.find(n => n.metadata.name === name)
      if (existing) namespace.metadata.uid = existing.metadata.uid
      if (filter(namespace)) resources.push(namespace)
    }
  }

  if (cfg.resources.configMaps?.length) {
    for (const configMap of cfg.resources.configMaps) {
      const { name, namespace } = configMap.metadata
      const { body: { items } } = await core.listNamespacedConfigMap(namespace)
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      if (existing) configMap.metadata.uid = existing.metadata.uid
      if (filter(configMap)) cfg.resources.all.push(configMap)
    }
  }

  if (cfg.resources.secrets?.length) {
    for (const secret of cfg.resources.secrets) {
      const { name, namespace } = secret.metadata
      const { body: { items } } = await core.listNamespacedSecret(namespace)
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      if (existing) secret.metadata.uid = existing.metadata.uid
      if (filter(secret)) cfg.resources.all.push(secret)
    }
  }

  if (cfg.resources.priorityClasses?.length) {
    const { body: { items } } = await sched.listPriorityClass()
    for (const priorityClass of cfg.resources.priorityClasses) {
      const { name } = priorityClass.metadata
      const existing = items.find(i => i.metadata.name === name)
      if (existing) priorityClass.metadata.uid = existing.metadata.uid
      if (filter(priorityClass)) cfg.resources.all.push(priorityClass)
    }
  }

  if (cfg.resources.deployments.length) {
    const { body: { items } } = await apps.listDeploymentForAllNamespaces()
    for (const deployment of cfg.resources.deployments) {
      const { name, namespace } = deployment.metadata
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      if (existing) deployment.metadata.uid = existing.metadata.uid
      if (filter(deployment)) cfg.resources.all.push(deployment)
    }
  }

  if (cfg.resources.services.length) {
    const { body: { items } } = await core.listServiceForAllNamespaces()
    for (const service of cfg.resources.services) {
      const { name, namespace } = service.metadata
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      if (existing) service.metadata.uid = existing.metadata.uid
      if (filter(service)) cfg.resources.all.push(service)
    }
  }

  if (cfg.resources.ingresses?.length) {
    const { body: { items } } = await net.listIngressForAllNamespaces()
    for (const ingress of cfg.resources.ingresses) {
      const { name, namespace } = ingress.metadata
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      if (existing) ingress.metadata.uid = existing.metadata.uid
      if (filter(ingress)) cfg.resources.all.push(ingress)
    }
  }

  logger.debug('getResources', cfg.resources)
}
