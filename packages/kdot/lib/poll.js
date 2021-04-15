// Based on https://github.com/sindresorhus/p-wait-for

import pTimeout from 'p-timeout'

export default async function poll ({ request, condition, ...options }) {
  const { interval = 20, leadingCheck = true } = options

  let lastResponse
  let retryTimeout
  const promise = new Promise((resolve, reject) => {
    const check = async () => {
      try {
        // If a request is specified, execute it.
        let value
        if (request) value = await request()
        if (value) lastResponse = value

        // Execute the condition with the value returned by the request.
        let result
        if (condition) result = await condition(value)

        if (result) {
          // If the condition is truthy, resolve with the request value or
          // condition result.
          resolve(value || result)
        } else {
          // If the condition is falsy, queue another check.
          retryTimeout = setTimeout(check, interval)
        }
      } catch (error) {
        reject(error)
      }
    }

    // Perform the check immediately if the leadingCheck option is truthy,
    // otherwise perform it after the interval.
    if (leadingCheck) {
      check()
    } else {
      retryTimeout = setTimeout(check, interval)
    }
  })

  // If a timeout is specified, throw an error if it expires before the
  // condition is satisfied.
  if (options.timeout) {
    try {
      const name = request.name || 'request'
      const msg = `Poll timeout after ${options.timeout}ms for ${name}`
      const callback = () => {
        const err = new Error(msg)
        err.response = lastResponse
        throw err
      }
      return pTimeout(promise, options.timeout, callback)
    } catch (error) {
      if (retryTimeout) clearTimeout(retryTimeout)
      throw error
    }
  }

  return promise
}
