import configure from '../configure/index.js'
import showResources from '../showResources.js'

export default async function show (input) {
  const cfg = input.input ? input : await configure(input)
  process.stdout.write('\n')
  await showResources(cfg)
  process.stdout.write('\n')
}
