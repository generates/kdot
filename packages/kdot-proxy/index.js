export default function kdotProxy ({ email, provider, secret } = {}) {
  // Add default secret configuration.
  if (secret) {
    if (!secret.name) secret.name = 'dns-credentials'
    if (!secret.ref) secret.ref = 'token'
  }

  return {
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
        role: {
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
      }
    },
    ...email && provider && secret
      ? {
          custom: [{
            apiVersion: 'cert-manager.io/v1',
            kind: 'ClusterIssuer',
            metadata: {
              name: 'kdot-cluster-issuer'
            },
            spec: {
              acme: {
                email,
                server: 'https://acme-v02.api.letsencrypt.org/directory',
                privateKeySecretRef: { name: 'kdot-proxy' },
                solvers: [
                  {
                    dns01: {
                      [provider]: {
                        [`${secret.ref}SecretRef`]: {
                          name: secret.name,
                          key: Object.keys(secret.values[0])[0]
                        }
                      }
                    }
                  }
                ]
              }
            }
          }],
          secrets: [{ namespace: 'cert-manager', ...secret }]
        }
      : {}
  }
}
