import { merge } from '@generates/merger'

export default function kdotWebdriver (config = {}) {
  const {
    tag = '4.0.0-beta-3-prerelease-20210329',
    hub,
    chrome,
    firefox
  } = config
  const volumes = [{ name: 'dshm', emptyDir: { medium: 'Memory' } }]
  const volumeMounts = [{ name: 'dshm', mountPath: '/dev/shm' }]
  const shm = { volumeMounts, volumes }

  return {
    apps: {
      hub: merge(
        {
          image: { repo: 'selenium/hub', tag },
          ports: {
            pub: { port: 4442, localPort: false },
            sub: { port: 4443, localPort: false },
            hub: { port: 4444 }
          }
        },
        hub
      ),
      ...chrome
        ? {
            chrome: merge(
              {
                dependsOn: ['hub'],
                image: { repo: 'selenium/node-chrome', tag },
                ...shm,
                env: {
                  SE_EVENT_BUS_HOST: 'hub',
                  SE_EVENT_BUS_PUBLISH_PORT: '4442',
                  SE_EVENT_BUS_SUBSCRIBE_PORT: '4443',
                  VNC_NO_PASSWORD: '1'
                },
                ports: {
                  app: { port: 5900, localPort: 5900 }
                }
              },
              chrome
            )
          }
        : {},
      ...firefox
        ? {
            firefox: merge(
              {
                dependsOn: ['hub'],
                image: { repo: 'selenium/node-firefox', tag },
                ...shm,
                env: {
                  SE_EVENT_BUS_HOST: 'hub',
                  SE_EVENT_BUS_PUBLISH_PORT: '4442',
                  SE_EVENT_BUS_SUBSCRIBE_PORT: '4443',
                  VNC_NO_PASSWORD: '1'
                },
                ports: {
                  app: { port: 5900, localPort: 5901 }
                }
              },
              firefox
            )
          }
        : {}
    }
  }
}
