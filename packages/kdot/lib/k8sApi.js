import k8s from '@kubernetes/client-node'

export const kc = new k8s.KubeConfig()

export const clients = {}
export function makeClients (context) {
  if (context) kc.setCurrentContext(context)
  kc.loadFromDefault()

  clients.core = kc.makeApiClient(k8s.CoreV1Api)
  clients.apps = kc.makeApiClient(k8s.AppsV1Api)
  clients.net = kc.makeApiClient(k8s.NetworkingV1Api)
  clients.sched = kc.makeApiClient(k8s.SchedulingV1Api)
  clients.rbac = kc.makeApiClient(k8s.RbacAuthorizationV1Api)
  clients.custom = kc.makeApiClient(k8s.CustomObjectsApi)
  clients.klog = new k8s.Log(kc)
}
makeClients()

export { k8s }
