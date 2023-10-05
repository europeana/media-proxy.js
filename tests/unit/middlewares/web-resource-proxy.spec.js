import sinon from 'sinon'

import createWebResourceProxyMiddleware, { webResourceProxyOptions } from '@/middlewares/web-resource-proxy.js'

const fixtures = {
  reqHeadersToDrop: {
    cookie: 'monster',
    origin: 'https://www.example.org'
  },
  reqHeadersToKeep: {
    accept: '*',
    'accept-encoding': 'gzip',
    'accept-language': 'en',
    'if-match': 'w/v1',
    'if-modified-since': '2023-01-01',
    referer: 'https://www.example.org/page.html',
    'user-agent': 'curl'
  },
  webResourceId: 'https://www.example.org/image.jpg',
  webResourceIdWithCharsEncoded: 'https://www.example.org/Te%C5%BEak.jpg',
  webResourceIdWithCharsToEncode: 'https://www.example.org/Težak.jpg'
}

describe('@/middlewares/web-resource-proxy.js', () => {
  afterEach(sinon.resetHistory)

  describe('middleware', () => {
    const proxyMiddlewareStub = sinon.stub()
    const createProxyMiddleware = sinon.stub().returns(proxyMiddlewareStub)
    const next = sinon.spy()
    const req = {}

    describe('when response locals has webResourceId', () => {
      const res = {
        locals: { webResourceId: fixtures.webResourceId },
        redirect: sinon.spy(),
        sendStatus: sinon.spy(),
        setHeader: sinon.spy()
      }

      it('uses proxyMiddleware to proxy to provider', () => {
        createWebResourceProxyMiddleware(createProxyMiddleware)(req, res, next)

        expect(createProxyMiddleware.called).toBe(true)
        expect(proxyMiddlewareStub.called).toBe(true)
      })

      describe('custom x-europeana-web-resource header', () => {
        it('is set to web resource ID', () => {
          createWebResourceProxyMiddleware(createProxyMiddleware)(req, res, next)

          expect(res.setHeader.calledWith('x-europeana-web-resource', fixtures.webResourceId)).toBe(true)
        })

        it('encodes characters not permitted in HTTP header values', () => {
          createWebResourceProxyMiddleware(createProxyMiddleware)(req, {
            ...res,
            locals: { webResourceId: fixtures.webResourceIdWithCharsToEncode }
          }, next)

          expect(res.setHeader.calledWith('x-europeana-web-resource', fixtures.webResourceIdWithCharsEncoded)).toBe(true)
        })
      })

      describe('request header filtering', () => {
        const req = {
          headers: {
            ...fixtures.reqHeadersToKeep,
            ...fixtures.reqHeadersToDrop
          }
        }

        it('keeps select headers', () => {
          createWebResourceProxyMiddleware(createProxyMiddleware)(req, res, next)

          for (const name in fixtures.reqHeadersToKeep) {
            expect(req.headers[name]).toBe(fixtures.reqHeadersToKeep[name])
          }
        })

        it('drops other headers', () => {
          createWebResourceProxyMiddleware(createProxyMiddleware)(req, res, next)

          for (const name in fixtures.reqHeadersToDrop) {
            expect(req.headers[name]).toBeUndefined()
          }
        })
      })
    })
  })

  describe('webResourceProxyOptions', () => {
    it('changes origin in proxied request', () => {
      const proxyOptions = webResourceProxyOptions(fixtures.webResourceId)

      expect(proxyOptions.changeOrigin).toBe(true)
    })

    it('follows redirects from proxied response', () => {
      const proxyOptions = webResourceProxyOptions(fixtures.webResourceId)

      expect(proxyOptions.followRedirects).toBe(true)
    })

    describe('onError', () => {
      it('calls next', () => {
        const next = sinon.spy()
        const proxyOptions = webResourceProxyOptions(fixtures.webResourceId, next)
        const err = new Error()

        proxyOptions.onError(err)

        expect(next.calledWith(err)).toBe(true)
      })
    })

    describe('onProxyReq', () => {
      const next = sinon.spy()
      const proxyOptions = webResourceProxyOptions(fixtures.webResourceId, next)

      let proxyReqTimeoutCallback
      const proxyReqSetTimeoutStub = sinon.stub().callsFake((interval, callback) => proxyReqTimeoutCallback = callback)
      const proxyReq = { abort: sinon.spy(), removeHeader: sinon.spy(), setTimeout: proxyReqSetTimeoutStub }

      let reqTimeoutCallback
      const reqSetTimeoutStub = sinon.stub().callsFake((interval, callback) => reqTimeoutCallback = callback)
      const req = { abort: sinon.spy(), setTimeout: reqSetTimeoutStub }

      const res = { sendStatus: sinon.spy() }

      it('sets timeout handler on proxied request', () => {
        proxyOptions.onProxyReq(proxyReq, req, res)

        expect(proxyReq.setTimeout.calledWith(10000, sinon.match.func)).toBe(true)
        proxyReqTimeoutCallback()
        expect(proxyReq.abort.called).toBe(true)
        expect(res.sendStatus.calledWith(504)).toBe(true)
      })

      it('sets timeout handler on original request', () => {
        proxyOptions.onProxyReq(proxyReq, req, res)

        expect(req.setTimeout.calledWith(10000, sinon.match.func)).toBe(true)
        reqTimeoutCallback()
        expect(req.abort.called).toBe(true)
        expect(res.sendStatus.calledWith(504)).toBe(true)
      })

      it('passes error to next middleware', () => {
        const err = new Error()
        const proxyReq = { removeHeader: sinon.spy(), setTimeout: sinon.stub().throws(err) }

        proxyOptions.onProxyReq(proxyReq, req, res)

        expect(next.calledWith(err)).toBe(true)
      })
    })

    describe('onProxyRes', () => {
      const next = sinon.spy()
      const proxyOptions = webResourceProxyOptions(fixtures.webResourceId, next)
      const proxyRes = { headers: {} }
      const res = { redirect: sinon.spy(), sendStatus: sinon.spy(), setHeader: sinon.spy() }
      const req = { params: {}, query: {} }

      describe('proxied response header normalisation', () => {
        it('keeps select headers', () => {
          const proxyRes = {
            headers: {
              etag: 'v1'
            }
          }

          proxyOptions.onProxyRes(proxyRes, req, res)

          expect(proxyRes.headers.etag).toBe('v1')
        })

        it('removes other headers', () => {
          const proxyRes = {
            headers: {
              'set-cookie': 'crumbly'
            }
          }

          proxyOptions.onProxyRes(proxyRes, req, res)

          expect(proxyRes.headers['set-cookie']).toBeUndefined()
        })

        it('defaults content-type to "application/octet-stream" if absent', () => {
          const proxyRes = {
            headers: {}
          }

          proxyOptions.onProxyRes(proxyRes, req, res)

          expect(proxyRes.headers['content-type']).toBe('application/octet-stream')
        })
      })

      describe('when upstream response is an error', () => {
        const proxyRes = { headers: {}, statusCode: 400 }

        it('sends status code per the upstream', () => {
          proxyOptions.onProxyRes(proxyRes, null, res)

          expect(res.sendStatus.calledWith(400)).toBe(true)
        })
      })

      describe('when upstream resource is an HTML document', () => {
        const proxyRes = { headers: { 'content-type': 'text/html' } }

        it('302 redirects to it', () => {
          proxyOptions.onProxyRes(proxyRes, null, res)

          expect(res.redirect.calledWith(302, fixtures.webResourceId)).toBe(true)
        })
      })

      describe('when upstream resource is to be proxied', () => {
        const proxyRes = { headers: { 'content-type': 'image/jpeg' } }
        const req = {
          params: { datasetId: '123', localId: 'abc', webResourceHash: 'd1299d035beb29c5b3b36e7f7c5c8610' },
          query: {}
        }

        describe('content-disposition response header', () => {
          it('defaults to attachment, with derived filename', () => {
            proxyOptions.onProxyRes(proxyRes, req, res)

            expect(res.setHeader.calledWith(
              'content-disposition',
              'attachment; filename="Europeana.eu-123-abc-d1299d035beb29c5b3b36e7f7c5c8610.jpeg"'
            )).toBe(true)
          })

          describe('with disposition=inline in request query', () => {
            it('is inline, with derived filename', () => {
              proxyOptions.onProxyRes(proxyRes, { ...req, query: { disposition: 'inline' } }, res)

              expect(res.setHeader.calledWith(
                'content-disposition',
                'inline; filename="Europeana.eu-123-abc-d1299d035beb29c5b3b36e7f7c5c8610.jpeg"'
              )).toBe(true)
            })
          })
        })
      })

      it('passes error to next middleware', () => {
        const err = new Error()
        const res = { setHeader: sinon.stub().throws(err) }

        proxyOptions.onProxyRes(proxyRes, req, res)

        expect(next.calledWith(err)).toBe(true)
      })
    })

    describe('pathRewrite', () => {
      it('returns the web resource URL path plus query', () => {
        const webResourceId = 'https://www.example.org/image.jpg?size=large'
        const proxyOptions = webResourceProxyOptions(webResourceId)

        expect(proxyOptions.pathRewrite()).toBe('/image.jpg?size=large')
      })
    })

    describe('target', () => {
      it('is set to the web resource URL origin', () => {
        const proxyOptions = webResourceProxyOptions(fixtures.webResourceId)

        expect(proxyOptions.target).toBe('https://www.example.org')
      })
    })
  })
})
