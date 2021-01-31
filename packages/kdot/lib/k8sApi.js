import k8s from '@kubernetes/client-node'

export const kc = new k8s.KubeConfig()
kc.loadFromDefault()

export const core = kc.makeApiClient(k8s.CoreV1Api)
export const apps = kc.makeApiClient(k8s.AppsV1Api)
export const net = kc.makeApiClient(k8s.NetworkingV1Api)
export const sched = kc.makeApiClient(k8s.SchedulingV1Api)
export const rbac = kc.makeApiClient(k8s.RbacAuthorizationV1Api)
export const klog = new k8s.Log(kc)

export { k8s }
