export default {
  namespace: 'kdot',
  apps: {
    'kdot-auth-proxy': {
      image: { repo: 'generates/kdot-auth-proxy', tag: 'latest' },
      ports: [{ port: 3003 }],
      env: { PORT: '3003' }
    },
    redis: {
      image: { repo: 'redis', tag: '6' },
      ports: [{ port: 6379 }]
    }
  }
}
