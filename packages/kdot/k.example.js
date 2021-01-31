import kdotProxy from '@generates/kdot-proxy'

const context = 'git://github.com/generates/kdot.git#refs/heads/actions-runner'

export default {
  namespace: 'dev',
  apps: {
    redis: {
      image: { repo: 'redis', tag: '6' },
      ports: [{ port: 6379, localPort: 8500 }]
    },
    web: {
      image: { repo: 'generates/example-web' },
      ports: [
        { port: 8000, localPort: 8501, host: 'test.example.com' }
      ],
      dependsOn: ['redis'],
      env: { PORT: '8000', APP_ENV: 'production' },
      secrets: [
        { name: 'hiipower', values: ['NUM'] }
      ],
      configMaps: [
        { name: 'getit', mountPath: '/etc/getit', files: ['package.json'] }
      ],
      build: { context, dockerfile: 'packages/kdot/example/Dockerfile' }
    }
  },
  secrets: [
    { name: 'blackerberry', values: ['SWEETER_JUICE'] }
  ],
  build: {
    user: process.env.DOCKER_USER,
    pass: process.env.DOCKER_PASS
  },
  ...kdotProxy({
    email: 'user@example.com',
    provider: 'digitalocean',
    secret: {
      ref: 'token',
      values: [{ 'access-token': 'DO_ACCESS_TOKEN' }]
    }
  })
}
