import k8s from '@kubernetes/client-node'

export * from '@kubernetes/client-node'

export const kc = new k8s.KubeConfig()

kc.loadFromDefault()

export const client = k8s.KubernetesObjectApi.makeApiClient(kc)

export const klog = new k8s.Log(kc)
