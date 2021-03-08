import path from 'path'
import { createRequire } from 'module'
import { get } from '@generates/dotter'

const require = createRequire(import.meta.url)

export default function getVersion (source, prop = 'version') {
  if (source.includes('.json')) {
    return get(require(path.resolve(source)), prop)
  }
}
