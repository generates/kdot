import { merge } from '@generates/merger'
import { createLogger } from '@generates/logger'
import { core, apps } from './k8sApi.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })
const labels = { managedBy: 'kdot' }

function toServicePort (p) {
  return { port: p.servicePot || p.port, targetPort: p.port }
}

export default async function configure (input) {
  let custom
  if (input.custom) {
    try {
      // FIXME: handle array.
      const mod = await import(input.custom)
      custom = mod.default
    } catch (err) {
      logger.debug('Error importing custom configuration', err)
    }
  }

  const { base, ext, namespace = 'default' } = input
  const cfg = merge({ namespace, input, base, custom }, base, custom, ext)

  logger.debug('Initial configuration', cfg)

  // Initialize the array of resources.
  cfg.resources = []

  // If there is a top-level namespace, add it to the resources array.
  cfg.namespaces = []
  if (cfg.namespace !== 'default') {
    const namespace = {
      kind: 'Namespace',
      metadata: { name: cfg.namespace, labels }
    }
    cfg.namespaces.push(namespace)
  }

  // Break apps down into individual Kubernetes resources.
  cfg.enabledApps = []
  cfg.deployments = []
  cfg.services = []
  cfg.secrets = []
  for (const [name, app] of Object.entries(cfg.apps)) {
    if (!app.disabled) {
      cfg.enabledApps.push({ name, ...app })

      // If a namespace isn't specified for the app, assign the top-level
      // namespace to it.
      if (!app.namespace) app.namespace = cfg.namespace

      // If there is a app-level namespace that is different from the
      // top-level namespace, add it to the resources array.
      if (app.namespace !== cfg.namespace) {
        const namespace = {
          kind: 'Namespace',
          metadata: { name: app.namespace, labels }
        }
        cfg.namespaces.push(namespace)
      }

      const appLabel = { app: name }

      let env
      if (app.env) {
        env = Object.entries(app.env).map(([name, value]) => ({ name, value }))
      }

      if (app.secrets) {
        env = env || []
        for (const given of app.secrets) {
          const secret = {
            kind: 'Secret',
            metadata: { name: given.name || app.name },
            data: {}
          }

          let addSecret = false
          for (const value of given.values) {
            if (typeof value === 'string') {
              const envValue = process.env[value]
              if (envValue) {
                addSecret = true
                secret.data[value] = envValue
                const secretKeyRef = { name: secret.name, key: value }
                env.push({ name: value, valueFrom: { secretKeyRef } })
              } else {
                logger.warn('todo')
              }
            } else if (typeof value === 'object') {
              for (const [secretKey, envKey] of Object.entries(value)) {
                const envValue = process.env[envKey]
                if (envValue) {
                  addSecret = true
                  secret.data[secretKey] = envValue
                  const secretKeyRef = { name: secret.name, key: secretKey }
                  env.push({ name: secretKey, valueFrom: { secretKeyRef } })
                } else {
                  logger.warn('todo')
                }
              }
            }
          }

          for (const key of given.keys) {
            if (typeof key === 'string') {
              const secretKeyRef = { name: secret.name, key }
              env.push({ name: key, valueFrom: { secretKeyRef } })
            } else if (typeof key === 'object') {
              for (const [secretKey, envKey] of Object.entries(key)) {
                const secretKeyRef = { name: secret.name, key: secretKey }
                env.push({ name: envKey, valueFrom: { secretKeyRef } })
              }
            }
          }

          if (addSecret) cfg.secrets.push(secret)
        }
      }

      const deployment = {
        kind: 'Deployment',
        metadata: {
          name,
          namespace: app.namespace,
          labels: { ...labels, ...appLabel }
        },
        spec: {
          replicas: app.replicas || 1,
          selector: { matchLabels: appLabel },
          template: {
            metadata: { labels: { ...labels, ...appLabel } },
            spec: {
              containers: [
                {
                  name,
                  image: `${app.image.repo}:${app.image.tag || 'latest'}`,
                  ports: app.ports?.map(p => ({ containerPort: p.port })),
                  env
                }
              ]
            }
          }
        }
      }
      cfg.deployments.push(deployment)

      if (app.ports?.length) {
        const service = {
          kind: 'Service',
          metadata: {
            name,
            namespace: app.namespace,
            labels
          },
          spec: {
            selector: appLabel,
            ports: app.ports.map(toServicePort)
          }
        }
        cfg.services.push(service)
      }
    }
  }

  if (cfg.namespaces.length) {
    const { body: { items } } = await core.listNamespace()
    for (const namespace of cfg.namespaces) {
      const { name } = namespace.metadata
      const existing = items.find(n => n.metadata.name === name)
      cfg.resources.push(existing || namespace)
    }
  }

  if (cfg.deployments.length) {
    const { body: { items } } = await apps.listDeploymentForAllNamespaces()
    for (const deployment of cfg.deployments) {
      const { name, namespace } = deployment.metadata
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      cfg.resources.push(merge({}, existing, deployment))
    }
  }

  if (cfg.services.length) {
    const { body: { items } } = await core.listServiceForAllNamespaces()
    for (const service of cfg.services) {
      const { name, namespace } = service.metadata
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      cfg.resources.push(merge({}, existing, service))
    }
  }

  if (cfg.secrets.length) {
    for (const secret of cfg.secrets) {
      const { name, namespace } = secret.metadata.name
      const { body: { items } } = await core.listNamespacedSecret(namespace)
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      if (!existing) cfg.resources.push(secret)
    }
  }

  logger.debug('Resources', cfg.resources)

  return cfg
}
