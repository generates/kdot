import { createLogger, chalk } from '@generates/logger'
import prompt from '@generates/prompt'
import { oneLine } from 'common-tags'
import { kc, core } from './k8sApi.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })
const noYesOptions = [
  { label: 'No', value: false },
  { label: 'Yes', value: true }
]

/**
 * Remove ephemeral apps from the cluster.
 */
export default async function del (cfg) {
  if (cfg.namespace !== 'default') {
    if (cfg.input.prompt) {
      console.log('ctx', kc.currentContext)
      try {
        const namespace = chalk.yellow(cfg.namespace)
        const cluster = chalk.yellow(kc.currentContext)
        const response = await prompt.select(
          oneLine`
            Are you sure you want to delete the ${namespace} namespace and all
            resources associated with it from ${cluster}?
          `,
          { options: noYesOptions }
        )
        if (response === 'No') return
      } catch (err) {
        logger.debug(err)
        return
      }
    }

    await core.deleteNamespace(
      cfg.namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      'Foreground'
    )
    logger.success('Deleted resources in namespace:', cfg.namespace)
  }

  // await Promise.allSettled(cfg.resources.map(async resource => {
  //   const { name, namespace } = resource.metadata
  //   try {
  //     if (resource.kind === 'Deplyoment') {
  //       await apps.deleteNamespacedDeployment(
  //         name,
  //         namespace,
  //         undefined,
  //         undefined,
  //         undefined,
  //         undefined,
  //         undefined,
  //         'Foreground'
  //       )
  //       logger.success('Removed Deployment:', name)
  //     } else if (resource.kind === 'Service') {
  //       await core.deleteNamespacedService(name, namespace)
  //       logger.success('Removed Service:', name)
  //     }
  //   } catch (err) {
  //     logger.error(err)
  //   }
  // }))

  // await Promise.allSettled(cfg.namespaces.map(async ns => {
  //   try {
  //     await core.deleteNamespace(ns.metadata.name)
  //   } catch (err) {
  //     logger.error(err)
  //   }
  // }))
}
