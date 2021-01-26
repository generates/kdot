import { core } from './k8sApi.js'

export default async function getPods (namespace, name, limit) {
  const { body: { items } } = await core.listNamespacedPod(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    `app=${name}`
  )
  return limit ? items.slice(0, limit) : items
}
