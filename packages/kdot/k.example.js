export default {
  namespace: 'dev',
  apps: {
    web: {
      image: { repo: 'ianwalter/example' },
      ports: [
        { port: 8000, localPort: 9000 }
      ],
      env: { PORT: '8000', APP_ENV: 'production' },
      secrets: [
        { name: 'hiipower', values: ['NUM'] }
      ]
    }
  }
}