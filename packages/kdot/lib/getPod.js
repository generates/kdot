import { core } from './k8sApi.js'

const byIsRunning = p => (
  p.status.phase === 'Running' && !p.metadata.deletionTimestamp
)

export default async function getPod (namespace, name) {
  // FIXME: Maybe we can implement our own local load balancer to simulate
  // the service and distribute traffic to all of the pods instead of just
  // the first one?
  const { body: { items } } = await core.listNamespacedPod(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    `app=${name}`
  )
  return items.find(byIsRunning) || items[0]
}
