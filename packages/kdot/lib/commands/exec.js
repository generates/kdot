import { createLogger } from '@generates/logger'
import { oneLine } from 'common-tags'
import { k8s } from '../k8s.js'
import getRunningPods from '../getRunningPods.js'
import configure from '../configure/index.js'

const logger = createLogger({ level: 'info', namespace: 'kdot.exec' })

export default async function exec (input) {
  const cfg = input.input ? input : await configure(input)
  const [appName, ...command] = cfg.input.args
  const { name, namespace } = cfg.apps[appName] || {}

  if (!name) throw new Error(`App not found: ${appName}`)

  let pod
  if (cfg.input.pod) {
    // Get specified pod.
    pod = await k8s.client.readNamespacedPod(cfg.input.pod, namespace)
  } else {
    // Get first running pod belonging to the app.
    pod = await getRunningPods({ namespace, name, limit: 1 })
  }

  // Determine which container to execute in.
  let container = pod.spec.containers[0]
  if (cfg.input.container) {
    container = pod.spec.containers.find(c => c.name === cfg.input.container)
    if (!container) {
      throw new Error(oneLine`
        Container ${cfg.input.container} not found in ${pod.metadata.name} for
        ${name}
      `)
    }
  }

  logger.debug(
    'Exec',
    {
      app: name,
      pod: pod.metadata.name,
      container: container.name,
      command
    }
  )

  // Execute command within the container.
  await k8s.ex.exec(
    namespace,
    pod.metadata.name,
    container.name,
    command,
    process.stdout,
    process.stderr,
    process.stdin,
    true, // TTY
    response => {
      if (response.status === 'Success') process.exit(0)
      process.stdout.write('\n')
      logger.error('Exec failure', response)
      process.stdout.write('\n')
      process.exit(1)
    }
  )
}
