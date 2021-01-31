import { createLogger } from '@generates/logger'
import { core, apps, net, sched, rbac, custom } from './k8sApi.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })
const byNs = (n, s) => i => i.metadata.name === n && i.metadata.namespace === s

export default async function getResources (cfg, filter) {
  const resources = []

  if (!filter) filter = r => r

  if (cfg.resources.namespaces?.length) {
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
      const existing = items.find(byNs(name, namespace))
      if (existing) configMap.metadata.uid = existing.metadata.uid
      if (filter(configMap)) resources.push(configMap)
    }
  }

  if (cfg.resources.secrets?.length) {
    for (const secret of cfg.resources.secrets) {
      const { name, namespace } = secret.metadata
      const { body: { items } } = await core.listNamespacedSecret(namespace)
      const existing = items.find(byNs(name, namespace))
      if (existing) secret.metadata.uid = existing.metadata.uid
      if (filter(secret)) resources.push(secret)
    }
  }

  if (cfg.resources.priorityClasses?.length) {
    const { body: { items } } = await sched.listPriorityClass()
    for (const priorityClass of cfg.resources.priorityClasses) {
      const { name } = priorityClass.metadata
      const existing = items.find(i => i.metadata.name === name)
      if (existing) priorityClass.metadata.uid = existing.metadata.uid
      if (filter(priorityClass)) resources.push(priorityClass)
    }
  }

  if (cfg.resources.deployments?.length) {
    const { body: { items } } = await apps.listDeploymentForAllNamespaces()
    for (const deployment of cfg.resources.deployments) {
      const { name, namespace } = deployment.metadata
      const existing = items.find(byNs(name, namespace))
      if (existing) deployment.metadata.uid = existing.metadata.uid
      if (filter(deployment)) resources.push(deployment)
    }
  }

  if (cfg.resources.services?.length) {
    const { body: { items } } = await core.listServiceForAllNamespaces()
    for (const service of cfg.resources.services) {
      const { name, namespace } = service.metadata
      const existing = items.find(byNs(name, namespace))
      if (existing) service.metadata.uid = existing.metadata.uid
      if (filter(service)) resources.push(service)
    }
  }

  if (cfg.resources.ingresses?.length) {
    const { body: { items } } = await net.listIngressForAllNamespaces()
    for (const ingress of cfg.resources.ingresses) {
      const { name, namespace } = ingress.metadata
      const existing = items.find(byNs(name, namespace))
      if (existing) ingress.metadata.uid = existing.metadata.uid
      if (filter(ingress)) resources.push(ingress)
    }
  }

  if (cfg.resources.roles?.length) {
    for (const role of cfg.resources.roles) {
      const { name, namespace } = role.metadata
      const { body: { items } } = await rbac.listNamespacedRole(namespace)
      const existing = items.find(byNs(name, namespace))
      if (existing) role.metadata.uid = existing.metadata.uid
      if (filter(role)) resources.push(role)
    }
  }

  if (cfg.resources.clusterRoles?.length) {
    const { body: { items } } = await rbac.listClusterRole()
    for (const role of cfg.resources.clusterRoles) {
      const existing = items.find(i => i.metadata.name === role.metadata.name)
      if (existing) role.metadata.uid = existing.metadata.uid
      if (filter(role)) resources.push(role)
    }
  }

  if (cfg.resources.serviceAccounts?.length) {
    for (const serviceAccount of cfg.resources.serviceAccounts) {
      const { name, namespace } = serviceAccount.metadata
      const { body: { items } } = await rbac.listNamespacedRole(namespace)
      const existing = items.find(byNs(name, namespace))
      if (existing) serviceAccount.metadata.uid = existing.metadata.uid
      if (filter(serviceAccount)) resources.push(serviceAccount)
    }
  }

  if (cfg.resources.roleBindings?.length) {
    for (const bind of cfg.resources.roleBindings) {
      const { name, namespace } = bind.metadata
      const { body: { items } } = await rbac.listNamespacedRoleBinding()
      const existing = items.find(byNs(name, namespace))
      if (existing) bind.metadata.uid = existing.metadata.uid
      if (filter(bind)) resources.push(bind)
    }
  }

  if (cfg.resources.clusterRoleBindings?.length) {
    const { body: { items } } = await rbac.listClusterRoleBinding()
    for (const bind of cfg.resources.clusterRoleBindings) {
      const existing = items.find(i => i.metadata.name === bind.metadata.name)
      if (existing) bind.metadata.uid = existing.metadata.uid
      if (filter(bind)) resources.push(bind)
    }
  }

  if (cfg.resources.custom?.length) {
    for (const cr of cfg.resources.custom) {
      const { name, namespace } = cr.metadata
      let items
      if (namespace) {
        const { body } = await custom.listNamespacedCustomObject(namespace)
        items = body.items
      } else {
        const { body } = await custom.listClusterCustomObject()
        items = body.items
      }
      const existing = items.find(byNs(name, namespace))
      if (existing) cr.metadata.uid = existing.metadata.uid
      if (filter(cr)) resources.push(cr)
    }
  }

  logger.debug('getResources', resources)

  return resources
}
