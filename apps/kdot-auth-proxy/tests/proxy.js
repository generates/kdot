import fs from 'fs'
import httpProxy from 'http-proxy'

const json = fs.readFileSync(new URL('hosts.json', import.meta.url))
const hosts = JSON.parse(json)

let port = 3004
for (const [index, hostname] of Object.keys(hosts).entries()) {
  // Determine the port the proxy will listen to for each host/domain.
  port = port + index

  // Create a proxy server for each host/domain that will proxy to
  // kdot-auth-proxy.
  const proxy = httpProxy.createProxyServer({ target: 'http://localhost:3003' })

  // Set the X-Forwarded-Host header for each request that is proxied for a host
  // so that the test server knows what the host is.
  proxy.on('proxyReq', pr => pr.setHeader('X-Forwarded-Host', hostname))

  // Instruct the proxy server to listen on the port and start serving requests.
  proxy.listen(port)
}
