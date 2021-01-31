export default {
  namespace: 'proxy',
  apps: {
    traefik: {
      image: { repo: 'traefik', tag: 'v2.4' },
      service: {
        spec: { type: 'LoadBalancer' }
      },
      ports: [
        { name: 'traefik', port: 9000 },
        { name: 'web', port: 80, targetPort: 8000 },
        { name: 'websecure', port: 443, targetPort: 8443 }
      ],
      configMaps: [
        {
          name: 'traefik',
          mountPath: '/etc/traefik',
          files: ['config/traefik.toml']
        }
      ],
      roles: [
        {
          cluster: true,
          rules: [
            {
              apiGroups: [''],
              resources: ['services', 'endpoints', 'secrets'],
              verbs: ['get', 'list', 'watch']
            },
            {
              apiGroups: ['extensions', 'networking.k8s.io'],
              resources: ['ingresses', 'ingressclasses'],
              verbs: ['get', 'list', 'watch']
            },
            {
              apiGroups: ['extensions', 'networking.k8s.io'],
              resources: ['ingresses/status'],
              verbs: ['update']
            },
            {
              apiGroups: ['traefik.containo.us'],
              resources: [
                'ingressroutes',
                'ingressroutetcps',
                'ingressrouteudps',
                'middlewares',
                'tlsoptions',
                'tlsstores',
                'traefikservices',
                'serverstransports'
              ],
              verbs: ['get', 'list', 'watch']
            }
          ]
        }
      ]
    }
  }
}
