export default {
  namespace: 'kdot',
  apps: {
    traefik: {
      image: { repo: 'traefik', tag: 'v2.4' },
      service: { type: 'LoadBalancer' },
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
      ]
    }
  }
}
