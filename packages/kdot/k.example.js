import { load } from '@generates/kdot'

export default {
  namespace: 'dev',
  apps: {
    redis: {
      image: { repo: 'redis', tag: '6' },
      ports: {
        app: { port: 6379, localPort: 8500 }
      }
    },
    web: {
      image: { repo: 'generates/example-web' },
      ports: {
        app: { port: 8000, localPort: 8501, hosts: ['test.example.com'] }
      },
      dependsOn: ['redis'],
      env: { PORT: '8000', APP_ENV: 'production' },
      secrets: {
        hiipower: { env: ['NUM'] }
      },
      configMaps: {
        getit: { mountPath: '/etc/getit', files: ['package.json'] }
      },
      build: { dockerfile: 'packages/kdot/example/Dockerfile' }
    },
    admin: load('tests/fixtures/admin/admin')
  },
  secrets: {
    blackerberry: { env: ['SWEETER_JUICE'] }
  },
  build: {
    user: process.env.DOCKER_USER,
    pass: process.env.DOCKER_PASS
  }
}
