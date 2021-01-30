export default {
  apps: {
    kdotAuthProxy: {
      image: { repo: 'generats/kdot-auth-proxy', tag: 'latest' },
      ports: [{ port: 3003 }],
      env: { PORT: '3003' }
    },
    kdotAuthProxyRedis: {
      image: { repo: 'redis', tag: '6' },
      ports: [{ port: 6379 }]
    }
  }
}
