// Based on https://github.com/sindresorhus/p-wait-for

import pTimeout from 'p-timeout'

const isNotEmpty = value => Array.isArray(value) ? value.length : value

export default async function poll (options = {}) {
  const { request, condition, interval = 20, leadingCheck = true } = options

  let value
  let retryTimeout
  const promise = new Promise((resolve, reject) => {
    const check = async () => {
      try {
        // If a request is specified, execute it.
        if (request) value = await request()

        // Execute the condition with the value returned by the request.
        let result
        if (condition) result = await condition(value)

        if (result || (!condition && isNotEmpty(value))) {
          // If the condition is truthy, resolve with the condition result or
          // request value.
          resolve(result || value)
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
      const name = `${options.name || 'poll'} ${condition?.name || 'request'}`
      const msg = `Timeout after ${options.timeout}ms for ${name}`
      const callback = () => {
        const err = new Error(msg)
        err.response = value
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
