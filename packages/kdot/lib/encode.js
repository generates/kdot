export default function encode (value) {
  const buffer = Buffer.from(value)
  return buffer.toString('base64')
}
