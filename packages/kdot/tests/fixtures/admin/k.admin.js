export default {
  image: { repo: 'generates/example-admin' },
  ports: {
    app: { port: 8000, localPort: 8502, hosts: ['admin.example.com'] }
  },
  dependsOn: ['redis'],
  env: {
    PORT: '8000',
    APP_ENV: 'production',
    SOME_VAR: { env: 'SOME_VAR' },
    ROOT_VAR: { env: 'ROOT_VAR' },
    NESTED_VAR: { env: 'NESTED_VAR' }
  }
}
