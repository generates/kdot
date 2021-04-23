import { merge } from '@generates/merger'

export default function kdotPostgres (config = {}) {
  return merge(
    {
      image: { repo: 'postgres', tags: ['13'] },
      ports: {
        db: { port: 5432 }
      },
      readinessProbe: {
        exec: {
          command: [
            '/bin/sh',
            '-c',
            '-e',
            'pg_isready -U $POSTGRES_USER -d $POSTGRES_DB -h 127.0.0.1 -p 5432'
          ]
        },
        initialDelaySeconds: 5,
        periodSeconds: 10,
        timeoutSeconds: 5,
        successThreshold: 1,
        failureThreshold: 5
      }
    },
    config
  )
}
