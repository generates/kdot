import { createRequire } from 'module'
import path from 'path'
import { merge } from '@generates/merger'
import { createLogger } from '@generates/logger'
import { including } from '@generates/extractor'
import { V1Container } from '@kubernetes/client-node'
import { core, apps, net, sched } from '../k8sApi.js'
import configureConfigMaps from './configMaps.js'
import configureSecrets from './secrets.js'
import configurePriorityClass from './priorityClass.js'

const require = createRequire(import.meta.url)
const logger = createLogger({ namespace: 'kdot.configure', level: 'info' })
const labels = { managedBy: 'kdot' }
const containerAttrs = V1Container.attributeTypeMap.map(a => a.name)

function toServicePort ({ localPort, ...port }) {
  return port
}

function toEnv ([name, value]) {
  if (typeof value === 'object') return { name, valueFrom: value }
  return { name, value }
}

export default async function configure ({ ext, ...input }) {
  const cfg = { input, namespace: 'default' }

  const configs = Array.isArray(input.config) ? input.config : [input.config]
  for (const config of configs) {
    const dirname = path.dirname(config)
    const basename = path.basename(config)
    const js = path.resolve(dirname, `k.${basename}.js`)
    const json = path.resolve(dirname, `k.${basename}.json`)

    try {
      const mod = await import(js)
      merge(cfg, mod.default)
    } catch (err) {
      logger.debug('Error importing config file', err)
    }

    try {
      merge(cfg, require(json))
    } catch (err) {
      logger.debug('Error importing json config file', err)
    }
  }

  logger.debug('Initial configuration', cfg)

  // Initialize the map of resources.
  cfg.resources = { all: [], namespaces: [], deployments: [], services: [] }

  // If there is a top-level namespace, add it to the resources array.
  if (cfg.namespace !== 'default') {
    const metadata = { name: cfg.namespace, labels }
    const namespace = { kind: 'Namespace', metadata }
    cfg.resources.namespaces.push(namespace)
  }

  // Configure top-level secrets.
  if (cfg.secrets) configureSecrets(cfg)

  // Break apps down into individual Kubernetes resources.
  for (const [name, app] of Object.entries(cfg.apps)) {
    const enabled = app.enabled !== false && input.args.length === 0

    // Determien if this app is being depended on by another specified app.
    const hasDependency = n => cfg.apps[n]?.dependsOn?.includes(name)
    app.isDependency = input.args.some(hasDependency)

    if (enabled || input.args.includes(name) || app.isDependency) {
      //
      app.enabled = true

      // If a namespace isn't specified for the app, assign the top-level
      // namespace to it.
      if (!app.namespace) app.namespace = cfg.namespace

      // Set app name to the key that was used to define it.
      app.name = name

      // If there is a app-level namespace that is different from the
      // top-level namespace, add it to the resources array.
      if (app.namespace !== cfg.namespace) {
        const metadata = { name: app.namespace, labels }
        const namespace = { kind: 'Namespace', metadata }
        cfg.resources.namespaces.push(namespace)
      }

      const appLabel = { app: name }

      // Configure app-level ConfigMaps and ConfigMap Volumes.
      if (app.configMaps) await configureConfigMaps(cfg, app)

      // Configure app-level Secrets and Secret references.
      if (app.secrets) configureSecrets(cfg, app)

      // Map environment variables from key-value pairs to Objects in an Array.
      if (app.env) app.env = Object.entries(app.env).map(toEnv)

      //
      const hasPriority = Number.isInteger(app.priority)
      if (hasPriority) configurePriorityClass(cfg, app)

      cfg.resources.deployments.push({
        app,
        kind: 'Deployment',
        metadata: {
          name,
          namespace: app.namespace,
          labels: { ...labels, ...appLabel }
        },
        spec: {
          replicas: Number.isInteger(app.replicas) ? app.replicas : 1,
          selector: { matchLabels: appLabel },
          template: {
            metadata: { labels: { ...labels, ...appLabel } },
            spec: {
              containers: [
                {
                  ...including(app, containerAttrs),
                  name,
                  image: typeof image === 'string'
                    ? app.image
                    : `${app.image.repo}:${app.image.tag || 'latest'}`,
                  ports: app.ports?.map(p => ({ containerPort: p.port }))
                }
              ],
              ...app.volumes ? { volumes: app.volumes } : {},
              ...hasPriority
                ? { priorityClassName: `priority-${app.priority}` }
                : {}
            }
          }
        }
      })

      if (app.ports?.length) {
        const service = {
          app,
          kind: 'Service',
          metadata: { name, namespace: app.namespace, labels },
          spec: { selector: appLabel, ports: app.ports.map(toServicePort) }
        }
        cfg.resources.services.push(service)

        const hostPorts = app.ports.filter(p => p.hosts)
        if (hostPorts.length) {
          const metadata = { name, namespace: app.namespace, labels }
          const spec = { rules: [] }
          const ingress = { app, kind: 'Ingress', metadata, spec }

          for (const p of hostPorts) {
            const pathType = p.pathType || 'Prefix'
            const service = { name, port: { number: p.port } }
            const path = { path: p.path || '/', pathType, backend: { service } }
            for (const host of p.hosts) {
              ingress.spec.rules.push({ host, http: { paths: [path] } })
            }
          }

          cfg.resources.ingresses = cfg.resources.ingresses || []
          cfg.resources.ingresses.push(ingress)
        }
      }
    }
  }

  if (cfg.resources.namespaces.length) {
    const { body: { items } } = await core.listNamespace()
    for (const namespace of cfg.resources.namespaces) {
      const { name } = namespace.metadata
      const existing = items.find(n => n.metadata.name === name)
      if (!existing) cfg.resources.all.push(namespace)
    }
  }

  if (cfg.resources.configMaps?.length) {
    for (const configMap of cfg.resources.configMaps) {
      const { name, namespace } = configMap.metadata
      const { app } = configMap
      const { body: { items } } = await core.listNamespacedConfigMap(namespace)
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      if (existing) configMap.metadata.uid = existing.metadata.uid
      if (!existing || !app?.isDependency) cfg.resources.all.push(configMap)
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
      if (!existing || !secret.app?.isDependency) cfg.resources.all.push(secret)
    }
  }

  if (cfg.resources.priorityClasses?.length) {
    const { body: { items } } = await sched.listPriorityClass()
    for (const priorityClass of cfg.resources.priorityClasses) {
      const { name } = priorityClass.metadata
      const existing = items.find(i => i.metadata.name === name)
      if (!existing) cfg.resources.all.push(priorityClass)
    }
  }

  if (cfg.resources.deployments.length) {
    const { body: { items } } = await apps.listDeploymentForAllNamespaces()
    for (const deployment of cfg.resources.deployments) {
      const { name, namespace } = deployment.metadata
      const { isDependency } = deployment.app
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      if (existing) deployment.metadata.uid = existing.metadata.uid
      if (!existing || !isDependency) cfg.resources.all.push(deployment)
    }
  }

  if (cfg.resources.services.length) {
    const { body: { items } } = await core.listServiceForAllNamespaces()
    for (const service of cfg.resources.services) {
      const { name, namespace } = service.metadata
      const { isDependency } = service.app
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      if (existing) service.metadata.uid = existing.metadata.uid
      if (!existing || !isDependency) cfg.resources.all.push(service)
    }
  }

  if (cfg.resources.ingresses?.length) {
    const { body: { items } } = await net.listIngressForAllNamespaces()
    for (const ingress of cfg.resources.ingresses) {
      const { name, namespace } = ingress.metadata
      const { isDependency } = ingress.app
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      if (existing) ingress.metadata.uid = existing.metadata.uid
      if (!existing || !isDependency) cfg.resources.all.push(ingress)
    }
  }

  logger.debug('Resources configuration', cfg.resources)

  return cfg
}
