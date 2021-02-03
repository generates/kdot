import { CoreV1Api, kc } from './k8s.js'

const client = kc.makeApiClient(CoreV1Api)

export default async function getPods (namespace, name, limit) {
  const { body: { items } } = await client.listNamespacedPod(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    `app=${name}`
  )
  return limit === 1 ? items.shift() : items.slice(0, limit)
}
