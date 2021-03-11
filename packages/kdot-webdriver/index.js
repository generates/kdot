import { merge } from '@generates/merger'

export default function kdotWebdriver (config = {}) {
  const { chrome, firefox, hub } = config
  const volumes = [{ name: 'dshm', emptyDir: { medium: 'Memory' } }]
  const volumeMounts = [{ name: 'dshm', mountPath: '/dev/shm' }]
  const shm = { volumeMounts, volumes }

  return {
    apps: {
      hub: merge(
        {
          image: {
            repo: 'selenium/hub',
            tag: '4.0.0-beta-2-prerelease-20210310'
          },
          ports: [
            { name: 'pub', port: 4442 },
            { name: 'sub', port: 4443 },
            { name: 'hub', port: 4444 }
          ]
        },
        hub
      ),
      ...chrome
        ? {
            chrome: merge(
              {
                dependsOn: ['hub'],
                image: {
                  repo: 'selenium/node-chrome',
                  tag: '4.0.0-beta-2-prerelease-20210310'
                },
                ...shm,
                env: {
                  SE_EVENT_BUS_HOST: 'hub',
                  SE_EVENT_BUS_PUBLISH_PORT: '4442',
                  SE_EVENT_BUS_SUBSCRIBE_PORT: '4443',
                  VNC_NO_PASSWORD: '1'
                },
                ports: [{ port: 5900, localPort: 5900 }]
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
                image: {
                  repo: 'selenium/node-firefox',
                  tag: '4.0.0-beta-2-prerelease-20210310'
                },
                ...shm,
                env: {
                  SE_EVENT_BUS_HOST: 'hub',
                  SE_EVENT_BUS_PUBLISH_PORT: '4442',
                  SE_EVENT_BUS_SUBSCRIBE_PORT: '4443',
                  VNC_NO_PASSWORD: '1'
                },
                ports: [{ port: 5900, localPort: 5901 }]
              },
              firefox
            )
          }
        : {}
    }
  }
}
