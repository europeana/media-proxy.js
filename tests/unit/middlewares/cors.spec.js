import sinon from 'sinon'

import corsMiddleware from '@/middlewares/cors.js'

const factory = (origin) => {
  const req = { headers: { origin } }
  const res = { getHeader: sinon.spy(), setHeader: sinon.spy() }
  const next = sinon.spy()
  return { next, req, res }
}

describe('@/middlewares/cors.js', () => {
  afterEach(sinon.resetHistory)

  describe('permitted origins', () => {
    const permittedOrigins = [
      'https://www.europeana.eu',
      'https://pro.europeana.eu',
      'https://www.test.eanadev.org',
      'https://www-test.eanadev.org',
      'https://europeana.github.io',
      'http://localhost:3000',
      'http://localhost:4000'
    ]

    for (const origin of permittedOrigins) {
      describe(`when origin is ${origin}`, () => {
        it('sets Access-Control-Allow-Origin header', () => {
          const { req, res, next } = factory(origin)

          corsMiddleware(req, res, next)

          expect(res.setHeader.calledWith('Access-Control-Allow-Origin', origin)).toBe(true)
        })

        it('sets Vary header to Origin', () => {
          const { req, res, next } = factory(origin)

          corsMiddleware(req, res, next)

          expect(res.setHeader.calledWith('Vary', 'Origin')).toBe(true)
        })

        it('calls next middleware', () => {
          const { req, res, next } = factory(origin)

          corsMiddleware(req, res, next)

          expect(next.called).toBe(true)
        })
      })
    }
  })

  describe('non-permitted origins', () => {
    const nonPermittedOrigins = [
      'http://www.europeana.eu',
      'https://www.example.org',
      undefined
    ]

    for (const origin of nonPermittedOrigins) {
      describe(`when origin is ${origin}`, () => {
        it('does not set Access-Control-Allow-Origin header', () => {
          const { req, res, next } = factory(origin)

          corsMiddleware(req, res, next)

          expect(res.setHeader.calledWith('Access-Control-Allow-Origin', origin)).toBe(false)
        })

        it('does not set Vary header to Origin', () => {
          const { req, res, next } = factory(origin)

          corsMiddleware(req, res, next)

          expect(res.setHeader.calledWith('Vary', 'Origin')).toBe(false)
        })

        it('calls next middleware', () => {
          const { req, res, next } = factory(origin)

          corsMiddleware(req, res, next)

          expect(next.called).toBe(true)
        })
      })
    }
  })
})
