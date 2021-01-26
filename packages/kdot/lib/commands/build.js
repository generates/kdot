import { createLogger } from '@generates/logger'
import applyResource from '../applyResource.js'
import configureSecrets from '../configure/secrets.js'
import getPods from '../getPods.js'
import getResources from '../getResources.js'
import poll from '../poll.js'

const toApp = a => a.app
const status = ['Succeeded', 'Failed']
const defaultDigest = '/dev/termination-log'
const logger = createLogger({ namespace: 'kdot.build', level: 'info' })

export default async function build (cfg) {
  const byEnabled = ([name, app]) => cfg.input.args
    ? cfg.input.args.includes(name) && app.enabled && !app.isDependency
    : app.enabled && !app.isDependency

  //
  const build = { namespace: cfg.namespace, resources: {} }
  configureNamespaces(build)

  const pods = []
  for (const app of Object.entries(cfg.apps).filter(byEnabled).map(toApp)) {
    if (app.build) {
      // Deconstruct the build args so that they can be overridden if necessary.
      const {
        dockerfile = `--dockerfile=${app.build.dockerfile || './Dockerfile'}`,
        context = `--context=${app.build.context}`,
        destination = `--destination=${app.taggedImage}`,
        digestFile = `--digest-file=${app.build.digestFile || defaultDigest}`,
        skipUnusedStaged = '--skip-unused-stages',
        ...args
      } = app.build.args || {}

      // If there is a build secret, like GIT_TOKEN, add it to the build pod.
      if (cfg.build?.secrets) configureSecrets(build, app)

      // Create the pod configuration.
      pods.push({
        app,
        kind: 'Pod',
        image: 'gcr.io/kaniko-project/executor',
        args: [
          ...dockerfile ? [dockerfile] : [],
          ...context ? [context] : [],
          ...destination ? [destination] : [],
          ...digestFile ? [digestFile] : [],
          ...skipUnusedStaged ? [skipUnusedStaged] : [],
          ...args ? Object.values(args) : []
        ],
        ...app.env ? { env: app.env } : {}
      })
    }
  }

  // Create any namespace or secret resources before creating the build pods.
  const resources = await getResources(build)
  if (resources.length) await Promise.all(resources.map(applyResource))

  // Perform the image builds by deploying the build pods to the cluster.
  await Promise.all(pods.map(async pod => {
    const { app } = pod

    // Deploy the build pod.
    await applyResource(pod)

    // Wait for the build pod to complete.
    const request = () => getPods(pod.metadata.namespace, pod.metadata.name, 1)
    const condition = pod => status.includes(pod.status.phase)
    pod = await poll({ request, condition, interval: 2000 })

    const { state } = pod.status.containerStatuses[0]
    if (pod.status.phase === 'Succeeded') {
      const digest = state.terminated.message
      logger.success(`Built ${app.image.repo} for ${app.name}: ${digest}`)
    } else {
      logger.fatal(`Build ${app.image.repo} failed for ${app.name}:`, state)
      process.exit(1)
    }
  }))
}
