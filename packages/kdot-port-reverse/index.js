export default function kdotPortReverse (config = {}) {
  const { port = 4000 } = config
  return {
    image: 'generates/kdot-port-reverse',
    ports: {
      app: { port }
    },
    env: { PORT_REVERSE_TARGET: config.target, PORT: port }
  }
}
