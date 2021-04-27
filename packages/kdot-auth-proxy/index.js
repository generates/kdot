import { merge } from '@generates/merger'
import kdotRedis from '@generates/kdot-redis'

export default function kdotAuthProxy ({ appKeys, hosts, origin, ...config }) {
  return merge(
    {
      apps: {
        redis: kdotRedis(),
        'kdot-auth-proxy': {
          image: { repo: 'generates/kdot-auth-proxy', tags: ['v0.0.7'] },
          ports: {
            app: { port: 3003, hosts: Object.keys(hosts) }
          },
          env: {
            PORT: '3003',
            APP_KEYS: appKeys,
            REDIS_HOST: 'redis',
            REDIS_PORT: '6379',
            ...origin ? { REDIRECT_ORIGIN: origin } : {}
          },
          configMaps: {
            hosts: {
              mountPath: '/opt/kdot-auth-proxy-conf',
              data: { 'hosts.json': JSON.stringify(hosts, undefined, 2) }
            }
          },
          secrets: {
            'kdot-auth-proxy': {
              values: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET']
            }
          }
        }
      }
    },
    config
  )
}
