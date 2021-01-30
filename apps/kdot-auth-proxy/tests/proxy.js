import fs from 'fs'
import httpProxy from 'http-proxy'

const json = fs.readFileSync(new URL('hosts.json', import.meta.url))
const hosts = JSON.parse(json)

let port = 3004
for (const [index, hostname] of Object.keys(hosts).entries()) {
  //
  port = port + index

  //
  const proxy = httpProxy.createProxyServer({ target: 'http://localhost:3003' })

  //
  proxy.on('proxyReq', pr => pr.setHeader('X-Forwarded-Host', hostname))

  //
  proxy.listen(port)
}
