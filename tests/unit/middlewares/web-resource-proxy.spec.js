import sinon from 'sinon'

import createWebResourceProxyMiddleware, { webResourceProxyOptions } from '@/middlewares/web-resource-proxy.js'

const fixtures = {
  reqHeadersToDrop: {
    cookie: 'monster',
    origin: 'https://www.example.org',
    'user-agent': 'curl'
  },
  reqHeadersToKeep: {
    accept: '*',
    'accept-encoding': 'gzip',
    'accept-language': 'en',
    'if-match': 'w/v1',
    'if-modified-since': '2023-01-01',
    range: 'bytes=11829248-',
    referer: 'https://www.example.org/page.html'
  },
  webResourceId: 'https://www.example.org/image.jpg',
  webResourceIdWithCharsEncoded: 'https://www.example.org/Te%C5%BEak.jpg',
  webResourceIdWithCharsToEncode: 'https://www.example.org/Težak.jpg'
}

describe('@/middlewares/web-resource-proxy.js', () => {
  afterEach(sinon.resetHistory)
  afterAll(sinon.resetBehavior)

  const next = sinon.stub().callsFake((error) => {
    if (error) {
      throw error
    }
  })

  describe('middleware', () => {
    const proxyMiddlewareStub = sinon.stub()
    const createProxyMiddleware = sinon.stub().returns(proxyMiddlewareStub)
    const req = { headers: {} }

    describe('when response locals has webResourceId', () => {
      const res = {
        getHeader: sinon.spy(),
        locals: { webResource: { about: fixtures.webResourceId } },
        redirect: sinon.spy(),
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
            locals: { webResource: { about: fixtures.webResourceIdWithCharsToEncode } }
          }, next)

          expect(res.setHeader.calledWith('x-europeana-web-resource', fixtures.webResourceIdWithCharsEncoded)).toBe(true)
        })
      })

      describe('request header filtering', () => {
        const req = {
          headers: {
            ...fixtures.reqHeadersToKeep,
            ...fixtures.reqHeadersToDrop
          },
          setHeader: sinon.spy()
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
      const next = sinon.spy()
      it('calls next', () => {
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
      const proxyReq = { abort: sinon.spy(), setHeader: sinon.spy(), setTimeout: proxyReqSetTimeoutStub }

      let reqTimeoutCallback
      const reqSetTimeoutStub = sinon.stub().callsFake((interval, callback) => reqTimeoutCallback = callback)
      const req = { abort: sinon.spy(), setTimeout: reqSetTimeoutStub }

      const res = {}

      it('sets a custom user-agent header', () => {
        proxyOptions.onProxyReq(proxyReq, req, res)

        expect(proxyReq.setHeader.calledWith('user-agent', sinon.match((value) => value.startsWith('EuropeanaMediaProxy/')))).toBe(true)
      })

      it('sets timeout handler on proxied request', () => {
        proxyOptions.onProxyReq(proxyReq, req, res)

        expect(proxyReq.setTimeout.calledWith(10000, sinon.match.func)).toBe(true)
        proxyReqTimeoutCallback()
        expect(proxyReq.abort.called).toBe(true)
        expect(next.calledWith(sinon.match((err) => err.status === 504))).toBe(true)
      })

      it('sets timeout handler on original request', () => {
        proxyOptions.onProxyReq(proxyReq, req, res)

        expect(req.setTimeout.calledWith(10000, sinon.match.func)).toBe(true)
        reqTimeoutCallback()
        expect(req.abort.called).toBe(true)
        expect(next.calledWith(sinon.match((err) => err.status === 504))).toBe(true)
      })

      it('passes error to next middleware', () => {
        const err = new Error()
        const proxyReq = { setHeader: sinon.spy(), setTimeout: sinon.stub().throws(err) }

        proxyOptions.onProxyReq(proxyReq, req, res)

        expect(next.calledWith(err)).toBe(true)
      })
    })

    describe('onProxyRes', () => {
      const next = sinon.spy()
      const proxyOptions = webResourceProxyOptions(fixtures.webResourceId, next)
      const proxyRes = { headers: {} }
      const res = { getHeader: sinon.spy(), redirect: sinon.spy(), setHeader: sinon.spy() }
      const req = { params: {}, query: {} }

      describe('proxy response header filtering', () => {
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
      })

      describe('when upstream response is an error', () => {
        const proxyRes = { headers: {}, statusCode: 400 }

        it('sends it to next', () => {
          proxyOptions.onProxyRes(proxyRes, null, res)

          expect(next.calledWith(sinon.match((err) => err.status === 400))).toBe(true)
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
        const req = {
          headers: {},
          params: { datasetId: '123', localId: 'abc', webResourceHash: 'd1299d035beb29c5b3b36e7f7c5c8610' },
          query: {}
        }

        describe('content-type header', () => {
          it('first, uses upstream content-type unless "application/octet-stream"', () => {
            const proxyRes = {
              headers: {
                'content-type': 'image/png'
              }
            }

            proxyOptions.onProxyRes(proxyRes, req, res)

            expect(res.setHeader.calledWith('content-type', 'image/png')).toBe(true)
          })

          it('second, is dervied from upstream content-disposition if present', () => {
            const proxyRes = {
              headers: {
                'content-disposition': 'attachment; filename="model.obj"',
                'content-type': 'application/octet-stream'
              }
            }

            proxyOptions.onProxyRes(proxyRes, req, res)

            expect(res.setHeader.calledWith('content-type', 'model/obj')).toBe(true)
          })

          it('last, falls back to "application/octet-stream"', () => {
            const proxyRes = {
              headers: {}
            }

            proxyOptions.onProxyRes(proxyRes, req, res)

            expect(res.setHeader.calledWith('content-type', 'application/octet-stream')).toBe(true)
          })
        })

        describe('content-disposition response header', () => {
          it('defaults to attachment', () => {
            const proxyRes = { headers: { 'content-type': 'image/jpeg' } }

            proxyOptions.onProxyRes(proxyRes, req, res)

            expect(res.setHeader.calledWith(
              'content-disposition',
              sinon.match((value) => value.startsWith('attachment; '))
            )).toBe(true)
          })

          describe('with disposition=inline in request query', () => {
            it('is inline', () => {
              const proxyRes = { headers: { 'content-type': 'image/jpeg' } }

              proxyOptions.onProxyRes(proxyRes, { ...req, query: { disposition: 'inline' } }, res)

              expect(res.setHeader.calledWith(
                'content-disposition',
                sinon.match((value) => value.startsWith('inline; '))
              )).toBe(true)
            })
          })

          describe('filename', () => {
            describe('basename', () => {
              it('is derived from request parameters', () => {
                const proxyRes = { headers: { 'content-type': 'image/jpeg' } }

                proxyOptions.onProxyRes(proxyRes, req, res)

                expect(res.setHeader.calledWith(
                  'content-disposition',
                  sinon.match((value) => value.includes('filename="Europeana.eu-123-abc-d1299d035beb29c5b3b36e7f7c5c8610'))
                )).toBe(true)
              })
            })

            describe('extension', () => {
              it('first, is taken from upstream content-type header', () => {
                const proxyRes = { headers: { 'content-type': 'image/jpeg' } }

                proxyOptions.onProxyRes(proxyRes, req, res)

                expect(res.setHeader.calledWith(
                  'content-disposition',
                  sinon.match((value) => value.endsWith('.jpeg"'))
                )).toBe(true)
              })

              it('second, is dervied from upstream content-disposition header', () => {
                const proxyRes = { headers: { 'content-disposition': 'attachment; filename="model.obj"' } }

                proxyOptions.onProxyRes(proxyRes, req, res)

                expect(res.setHeader.calledWith(
                  'content-disposition',
                  sinon.match((value) => value.endsWith('.obj"'))
                )).toBe(true)
              })

              it('finally, falls back to ".bin"', () => {
                const proxyRes = { headers: {} }

                proxyOptions.onProxyRes(proxyRes, req, res)

                expect(res.setHeader.calledWith(
                  'content-disposition',
                  sinon.match((value) => value.endsWith('.bin"'))
                )).toBe(true)
              })
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
