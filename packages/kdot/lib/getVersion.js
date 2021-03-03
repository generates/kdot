import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

export default function getVersion (source) {
  if (source.includes('.json')) {
    const { version } = require(path.resolve(source))
    return version
  }
}
