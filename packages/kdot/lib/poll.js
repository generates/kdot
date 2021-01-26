// Based on https://github.com/sindresorhus/p-wait-for

import pTimeout from 'p-timeout'

export default async function poll ({ request, condition, ...options }) {
  const { interval = 20, timeout = Infinity, leadingCheck = true } = options

  let retryTimeout
  const promise = new Promise((resolve, reject) => {
    const check = async () => {
      try {
        // If a request is specified, execute it.
        let value
        if (request) value = await request()

        // Execute the condition with the value returned by the request.
        const result = await condition(value)

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
      retryTimeout = setTimeout(check, options.interval)
    }
  })

  // If a timeout is specified, throw an error if it expires before the
  // condition is satisfied.
  if (timeout !== Infinity) {
    try {
      return pTimeout(promise, timeout)
    } catch (error) {
      if (retryTimeout) clearTimeout(retryTimeout)
      throw error
    }
  }

  return promise
}
