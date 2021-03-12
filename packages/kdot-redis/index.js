export default function (config = {}) {
  const { tag = '6', localPort, conf } = config
  return {
    image: { repo: 'redis', tag },
    ports: [{ port: 6379, localPort }],
    args: ['/opt/redis/redis.conf'],
    configMaps: {
      redis: {
        mountPath: '/opt/redis',
        files: [conf || new URL('redis.conf', import.meta.url)]
      }
    }
  }
}
