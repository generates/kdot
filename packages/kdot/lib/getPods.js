import { CoreV1Api, kc } from './k8s.js'

let client

export default async function getPods (namespace, name, limit) {
  client = client || kc.makeApiClient(CoreV1Api)
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
