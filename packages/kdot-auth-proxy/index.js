import kdotRedis from '@generates/kdot-redis'

export default {
  namespace: 'proxy',
  apps: {
    'kdot-auth-proxy': {
      image: { repo: 'generates/kdot-auth-proxy', tag: 'latest' },
      ports: {
        app: { port: 3003 }
      },
      env: { PORT: '3003' },
      secrets: [
        {
          name: 'kdot-auth-proxy',
          values: [
            'GITHUB_CLIENT_ID',
            'GITHUB_CLIENT_SECRET'
          ]
        }
      ]
    },
    redis: kdotRedis()
  }
}
