export default {
  namespace: 'kdot',
  apps: {
    proxy: {
      image: { repo: 'generates/kdot-auth-proxy', tag: 'latest' },
      ports: [{ port: 3003 }],
      env: { PORT: '3003' }
    }
  }
}
