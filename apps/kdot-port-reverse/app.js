import httpProxy from 'http-proxy'
import nrg from '@ianwalter/nrg'

const target = process.env.PORT_REVERSE_TARGET

//
const app = nrg.createApp()

app.logger.info('Target', target)

// Tell koa to use the X-Forwarded-Host header.
app.proxy = true

// Initialize the proxy.
const proxy = httpProxy.createProxyServer()

app.use(ctx => {
  ctx.respond = false
  return proxy.web(ctx.req, ctx.res, { target })
})

export default app
