import stream from 'stream'
import { k8s } from './k8s.js'

export default async function streamPodLogs (options) {
  await k8s.lg.log(
    options.namespace,
    options.name,
    undefined,
    new stream.Transform({
      transform (chunk, encoding, callback) {
        const logName = options.logName ? `${options.logName} • ` : ''
        process.stdout.write(logName + chunk.toString(), callback)
      }
    }),
    options.done,
    // FIXME: Add config for tailLines
    { follow: true, tailLines: 100 }
  )
}
