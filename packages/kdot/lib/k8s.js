import kubernetes from '@kubernetes/client-node'
import { createLogger } from '@generates/logger'

const logger = createLogger({ level: 'info', namespace: 'kdot.k8s' })

export * from '@kubernetes/client-node'

// Load the Kubernetes config.
export const kc = new kubernetes.KubeConfig()
kc.loadFromDefault()

export const k8s = {}
export function configureClients (context) {
  logger.debug('configureClients', context || '')

  // Set the Kubernetes config context (cluster).
  if (context) kc.setCurrentContext(context)

  // Create the general client using the Kubernetes config.
  k8s.client = kubernetes.KubernetesObjectApi.makeApiClient(kc)

  // Create the Log client using the Kubernetes config.
  k8s.klog = new kubernetes.Log(kc)

  // Create the copy client using the Kubernetes config.
  k8s.cp = new kubernetes.Cp(kc)
}
configureClients()
