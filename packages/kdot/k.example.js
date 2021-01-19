export default {
  namespace: 'dev',
  apps: {
    redis: {
      image: { repo: 'redis', tag: '6' },
      ports: [{ port: 6379, localPort: 8500 }]
    },
    web: {
      image: { repo: 'ianwalter/example' },
      ports: [
        { port: 8000, localPort: 8501, host: 'test.example.com' }
      ],
      env: { PORT: '8000', APP_ENV: 'production' },
      secrets: [
        { name: 'hiipower', values: ['NUM'] }
      ],
      configMaps: [
        { name: 'getit', mountPath: '/etc/getit', files: ['package.json'] }
      ]
    }
  }
}
