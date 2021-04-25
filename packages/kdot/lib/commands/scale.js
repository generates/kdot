import { createLogger } from '@generates/logger'
import { k8s } from '../k8s.js'
import configure from '../configure/index.js'

const logger = createLogger({ level: 'info', namespace: 'kdot.scale' })

export default async function scale (input) {
  const cfg = input.input ? input : await configure(input)

}
