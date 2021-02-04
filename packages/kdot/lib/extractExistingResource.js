import extractor from '@generates/extractor'

const annotation = 'kubectl.kubernetes.io/last-applied-configuration'

export default function extractExistingResource (existing) {
  const resource = Object.create(existing)
  delete resource.metadata.annotations[annotation]
  return extractor.excluding(resource, 'metadata.managedFields')
}
