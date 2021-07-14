import { worker } from 'workerpool'
import getReadyPods from './getReadyPods.js'

worker({
  getReadyPods
})
