import kdotRedis from '@generates/kdot-redis'

export default function kdotAuthProxy (config) {
  return {
    apps: {
      redis: kdotRedis(),
      'kdot-auth-proxy': {
        image: { repo: 'generates/kdot-auth-proxy', tags: ['v0.0.1'] },
        ports: {
          app: { port: 3003, hosts: Object.keys(config.hosts) }
        },
        env: {
          PORT: '3003',
          APP_KEYS: config.appKeys,
          REDIS_HOST: 'redis',
          REDIS_PORT: '6379'
        },
        configMaps: {
          hosts: {
            mountPath: '/opt/kdot-auth-proxy-conf',
            data: { 'hosts.json': JSON.stringify(config.hosts, undefined, 2) }
          }
        },
        secrets: {
          'kdot-auth-proxy': {
            values: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET']
          }
        }
      }
    }
  }
}
