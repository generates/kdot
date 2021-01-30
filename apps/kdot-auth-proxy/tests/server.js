import nrg from '@ianwalter/nrg'

const app = nrg.createApp({ name: 'Test Server', port: 3006 })

//
app.proxy = true

app.use(ctx => {
  ctx.logger.debug('Test server request', ctx.request.headers)
  ctx.body = `You made it to ${ctx.request.hostname}! Welcome!`
})

app.serve()
