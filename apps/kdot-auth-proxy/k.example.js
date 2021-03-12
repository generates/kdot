import { merge } from '@generates/merger'
import kdotAuthProxy from '@generates/kdot-auth-proxy'

const hosts = {
  'users.example.com': {
    url: 'http://example-server:3006',
    proxyUrl: 'http://localhost:3004',
    users: ['ianwalter']
  }
}
const authProxy = kdotAuthProxy({ hosts })

const apps = {
  'example-proxy': {
    ports: [{ name: 'users', port: '3004' }, { name: 'org', port: '3005' }],
    image: 'generates/example-proxy',
    imagePullPolicy: 'Always'
  },
  'example-server': {
    ports: [{ port: '3006' }],
    image: 'generates/example-server',
    imagePullPolicy: 'Always'
  }
}

export default { ...merge(authProxy, { apps }), namespace: 'example' }
