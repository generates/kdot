import { createLogger } from '@generates/logger'
import { k8s } from '../k8s.js'
import configure from '../configure/index.js'

const logger = createLogger({ level: 'info', namespace: 'kdot.roll' })

export default async function roll (input) {
  const cfg = input.input ? input : await configure(input)

  // Determine the number of replicas.
  const count = 3

  // Get pods.

  for (let i = 0; i <= count - 1; i++) {
    // If there are multiple pods, delete one.

    // Otherwise scale the replicas to 2.

    // Wait for new pod to be ready.

    // If there was only 1 pod before, delete it now that the new one is ready.
  }
}
