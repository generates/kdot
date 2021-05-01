import nrg from '@ianwalter/nrg'
import dashboard from './middleware/dashboard.js'

const app = nrg.createApp({
  next: { enabled: true }
})

app.get('/api/dashboard', dashboard)

export default app
