import { createLogger, chalk } from '@generates/logger'
import { oneLine } from 'common-tags'
import prompt from '@generates/prompt'
import { kc, core, apps, net, sched } from './k8sApi.js'
import getRunningPod from './getRunningPod.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })
const emojis = {
  ConfigMap: '🗄️',
  Deployment: '🚀',
  Namespace: '📛',
  PriorityClass: '🔢',
  Secret: '🤐',
  Service: '🛎️'
}

function logUpdate (resource) {
  const change = resource.metadata.uid
    ? chalk.blue('Update')
    : chalk.green('Create')
  const name = chalk.yellow(resource.metadata.name)
  const message = `${change} ${resource.kind}: ${name}`
  logger.log(emojis[resource.kind] || '☸️', message)
}

async function applyResource ({ app, ...resource }) {
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
        const toWait = name => getRunningPod(namespace, name)
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
    }
  } catch (err) {
    const level = cfg.input.failFast ? 'fatal' : 'error'
    logger[level](`Failed to apply ${resource.kind}:`, name)
    logger.error(err.response?.body?.message || err)
    if (level === 'fatal') process.exit(1)
  }
}

/**
 * Add configured apps to the cluster.
 */
export default async function apply (cfg) {
  const resources = cfg.input.update === false
    ? cfg.resources.all.filter(r => !r.metadata.uid)
    : cfg.resources.all

  if (cfg.input.prompt && resources.length) {
    try {
      logger.write('\n')
      resources.forEach(logUpdate)
      const cluster = chalk.yellow(kc.currentContext)
      const question = oneLine`
        Are you sure you want to apply all of these changes to ${cluster}?
      `
      const response = await prompt.select(question)
      if (response === 'No') return
    } catch (err) {
      logger.debug(err)
      process.exit(0)
    }
  }

  // Create or update top-level resources before app-level resources in case
  // the apps depend on them.
  const topLevelResources = resources.filter(r => !r.app)
  if (topLevelResources.length) await Promise.all(resources.map(applyResource))

  // Create the app-level resources.
  await Promise.all(Object.entries(cfg.app).map(async ([name]) => {
    for (const resource of resources.filter(r => r.app.name === name)) {
      await applyResource(resource)
    }
  }))
}
