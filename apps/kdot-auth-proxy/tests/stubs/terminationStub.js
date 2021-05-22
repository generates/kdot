import nrg from '@ianwalter/nrg'

const app = nrg.createApp({ name: 'Termination Stub', port: 3006 })

// Tell koa to use the X-Forwarded-Host header.
app.proxy = true

app.use(ctx => {
  ctx.logger.debug('Test server request', ctx.request.headers)
  ctx.body = `You made it to ${ctx.request.hostname}! Welcome!`
})

app.serve()
