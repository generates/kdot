import { core } from './k8sApi.js'

export default async function getPods (namespace, name) {
  const { body: { items } } = await core.listNamespacedPod(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    `app=${name}`
  )
  return items
}
