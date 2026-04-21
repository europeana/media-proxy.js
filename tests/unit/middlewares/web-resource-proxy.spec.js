import sinon from 'sinon'

import webResourceProxyMiddleware from '@/middlewares/web-resource-proxy.js'

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
    range: 'bytes=11829248-',
    referer: 'https://www.example.org/page.html'
  },
  webResourceId: 'https://www.example.org/image.jpg',
  webResourceIdWithCharsEncoded: 'https://www.example.org/Te%C5%BEak.jpg',
  webResourceIdWithCharsToEncode: 'https://www.example.org/Težak.jpg'
}

describe('@/middlewares/web-resource-proxy.js', () => {
  const fetchResponseMock = {
    body: '',
    headers: new Headers(),
    ok: true,
    status: 200
  }
  beforeAll(() => {
    sinon.stub(global, 'fetch')
  })
  beforeEach(() => {
    global.fetch.resolves(fetchResponseMock)
  })
  afterEach(sinon.resetHistory)
  afterAll(sinon.resetBehavior)

  describe('middleware', () => {
    const next = sinon.spy()
    const req = { headers: {}, params: {}, set: sinon.spy() }

    describe('when response locals has webResourceId', () => {
      const res = {
        end: sinon.spy(),
        locals: { webResourceId: fixtures.webResourceId },
        redirect: sinon.spy(),
        set: sinon.spy(),
        status: sinon.spy()
      }

      it('fetches upstream web resource', async () => {
        await webResourceProxyMiddleware(req, res, next)

        expect(global.fetch.getCalls().length).toBe(1)
        expect(global.fetch.getCalls()[0].args[0]).toBe(fixtures.webResourceId)
      })

      describe('proxied request', () => {
        const req = {
          headers: {
            ...fixtures.reqHeadersToKeep,
            ...fixtures.reqHeadersToDrop
          },
          params: {},
          set: sinon.spy()
        }

        it('proxies select headers', async () => {
          await webResourceProxyMiddleware(req, res, next)

          const proxyReqHeaders = global.fetch.getCalls()[0].args[1].headers
          for (const name in fixtures.reqHeadersToKeep) {
            expect(proxyReqHeaders.get(name)).toBe(fixtures.reqHeadersToKeep[name])
          }
        })

        it('drops other headers', async () => {
          await webResourceProxyMiddleware(req, res, next)

          const proxyReqHeaders = global.fetch.getCalls()[0].args[1].headers

          for (const name in fixtures.reqHeadersToDrop) {
            expect(proxyReqHeaders.get(name)).toBeNull()
          }
        })

        it('sets custom user-agent header', async () => {
          await webResourceProxyMiddleware(req, res, next)

          const proxyReqHeaders = global.fetch.getCalls()[0].args[1].headers

          expect(proxyReqHeaders.get('user-agent').startsWith('EuropeanaMediaProxy/')).toBe(true)
          expect(proxyReqHeaders.get('user-agent').endsWith(' (https://www.europeana.eu)')).toBe(true)
        })
      })

      describe('response', () => {
        describe('custom x-europeana-web-resource header', () => {
          it('is set to web resource ID', () => {
            webResourceProxyMiddleware(req, res, next)

            expect(res.set.calledWith('x-europeana-web-resource', fixtures.webResourceId)).toBe(true)
          })

          it('encodes characters not permitted in HTTP header values', () => {
            webResourceProxyMiddleware(req, {
              ...res,
              locals: { webResourceId: fixtures.webResourceIdWithCharsToEncode }
            }, next)

            expect(res.set.calledWith('x-europeana-web-resource', fixtures.webResourceIdWithCharsEncoded)).toBe(true)
          })
        })
      })
    })
  })

  // describe('webResourceProxyOptions', () => {
  // describe('onError', () => {
  //   it('calls next', () => {
  //     const next = sinon.spy()
  //     const proxyOptions = webResourceProxyOptions(fixtures.webResourceId, next)
  //     const err = new Error()

  //     proxyOptions.onError(err)

  //     expect(next.calledWith(err)).toBe(true)
  //   })
  // })

  // describe('onProxyReq', () => {
  //   const next = sinon.spy()
  //   const proxyOptions = webResourceProxyOptions(fixtures.webResourceId, next)

  //   let proxyReqTimeoutCallback
  //   const proxyReqSetTimeoutStub = sinon.stub().callsFake((interval, callback) => proxyReqTimeoutCallback = callback)
  //   const proxyReq = { abort: sinon.spy(), set: sinon.spy(), setTimeout: proxyReqSetTimeoutStub }

  //   let reqTimeoutCallback
  //   const reqSetTimeoutStub = sinon.stub().callsFake((interval, callback) => reqTimeoutCallback = callback)
  //   const req = { abort: sinon.spy(), setTimeout: reqSetTimeoutStub }

  //   const res = {}

  //   it('sets timeout handler on proxied request', () => {
  //     proxyOptions.onProxyReq(proxyReq, req, res)

  //     expect(proxyReq.setTimeout.calledWith(10000, sinon.match.func)).toBe(true)
  //     proxyReqTimeoutCallback()
  //     expect(proxyReq.abort.called).toBe(true)
  //     expect(next.calledWith(sinon.match((err) => err.status === 504))).toBe(true)
  //   })

  //   it('sets timeout handler on original request', () => {
  //     proxyOptions.onProxyReq(proxyReq, req, res)

  //     expect(req.setTimeout.calledWith(10000, sinon.match.func)).toBe(true)
  //     reqTimeoutCallback()
  //     expect(req.abort.called).toBe(true)
  //     expect(next.calledWith(sinon.match((err) => err.status === 504))).toBe(true)
  //   })

  //   it('passes error to next middleware', () => {
  //     const err = new Error()
  //     const proxyReq = { set: sinon.spy(), setTimeout: sinon.stub().throws(err) }

  //     proxyOptions.onProxyReq(proxyReq, req, res)

  //     expect(next.calledWith(err)).toBe(true)
  //   })
  // })

  //   describe('onProxyRes', () => {
  //     const next = sinon.stub()
  //     const proxyOptions = webResourceProxyOptions(fixtures.webResourceId, next)
  //     const proxyRes = { headers: {} }
  //     const res = { redirect: sinon.spy(), set: sinon.spy() }
  //     const req = { params: {}, query: {} }

  //     describe('proxy response header filtering', () => {
  //       it('keeps select headers', () => {
  //         const proxyRes = {
  //           headers: {
  //             etag: 'v1'
  //           }
  //         }

  //         proxyOptions.onProxyRes(proxyRes, req, res)

  //         expect(proxyRes.headers.etag).toBe('v1')
  //       })

  //       it('removes other headers', () => {
  //         const proxyRes = {
  //           headers: {
  //             'set-cookie': 'crumbly'
  //           }
  //         }

  //         proxyOptions.onProxyRes(proxyRes, req, res)

  //         expect(proxyRes.headers['set-cookie']).toBeUndefined()
  //       })
  //     })

  //     describe('when upstream response is an error', () => {
  //       const proxyRes = { headers: {}, statusCode: 400 }

  //       it('sends it to next', () => {
  //         proxyOptions.onProxyRes(proxyRes, null, res)

  //         expect(next.calledWith(sinon.match((err) => err.status === 400))).toBe(true)
  //       })
  //     })

  //     describe('when upstream resource is an HTML document', () => {
  //       const proxyRes = { headers: { 'content-type': 'text/html' } }

  //       it('302 redirects to it', () => {
  //         proxyOptions.onProxyRes(proxyRes, null, res)

  //         expect(res.redirect.calledWith(302, fixtures.webResourceId)).toBe(true)
  //       })
  //     })

  //     describe('when upstream resource is to be proxied', () => {
  //       const req = {
  //         params: { datasetId: '123', localId: 'abc', webResourceHash: 'd1299d035beb29c5b3b36e7f7c5c8610' },
  //         query: {}
  //       }

  //       describe('content-type header', () => {
  //         it('first, uses upstream content-type unless "application/octet-stream"', () => {
  //           const proxyRes = {
  //             headers: {
  //               'content-type': 'image/png'
  //             }
  //           }

  //           proxyOptions.onProxyRes(proxyRes, req, res)

  //           expect(res.set.calledWith('content-type', 'image/png')).toBe(true)
  //         })

  //         it('second, is dervied from upstream content-disposition if present', () => {
  //           const proxyRes = {
  //             headers: {
  //               'content-disposition': 'attachment; filename="model.obj"',
  //               'content-type': 'application/octet-stream'
  //             }
  //           }

  //           proxyOptions.onProxyRes(proxyRes, req, res)

  //           expect(res.set.calledWith('content-type', 'model/obj')).toBe(true)
  //         })

  //         it('last, falls back to "application/octet-stream"', () => {
  //           const proxyRes = {
  //             headers: {}
  //           }

  //           proxyOptions.onProxyRes(proxyRes, req, res)

  //           expect(res.set.calledWith('content-type', 'application/octet-stream')).toBe(true)
  //         })
  //       })

  //       describe('content-disposition response header', () => {
  //         it('defaults to attachment', () => {
  //           const proxyRes = { headers: { 'content-type': 'image/jpeg' } }

  //           proxyOptions.onProxyRes(proxyRes, req, res)

  //           expect(res.set.calledWith(
  //             'content-disposition',
  //             sinon.match((value) => value.startsWith('attachment; '))
  //           )).toBe(true)
  //         })

  //         describe('with disposition=inline in request query', () => {
  //           it('is inline', () => {
  //             const proxyRes = { headers: { 'content-type': 'image/jpeg' } }

  //             proxyOptions.onProxyRes(proxyRes, { ...req, query: { disposition: 'inline' } }, res)

  //             expect(res.set.calledWith(
  //               'content-disposition',
  //               sinon.match((value) => value.startsWith('inline; '))
  //             )).toBe(true)
  //           })
  //         })

  //         describe('filename', () => {
  //           describe('basename', () => {
  //             it('is derived from request parameters', () => {
  //               const proxyRes = { headers: { 'content-type': 'image/jpeg' } }

  //               proxyOptions.onProxyRes(proxyRes, req, res)

  //               expect(res.set.calledWith(
  //                 'content-disposition',
  //                 sinon.match((value) => value.includes('filename="Europeana.eu-123-abc-d1299d035beb29c5b3b36e7f7c5c8610'))
  //               )).toBe(true)
  //             })
  //           })

  //           describe('extension', () => {
  //             it('first, is taken from upstream content-type header', () => {
  //               const proxyRes = { headers: { 'content-type': 'image/jpeg' } }

  //               proxyOptions.onProxyRes(proxyRes, req, res)

  //               expect(res.set.calledWith(
  //                 'content-disposition',
  //                 sinon.match((value) => value.endsWith('.jpeg"'))
  //               )).toBe(true)
  //             })

  //             it('second, is dervied from upstream content-disposition header', () => {
  //               const proxyRes = { headers: { 'content-disposition': 'attachment; filename="model.obj"' } }

  //               proxyOptions.onProxyRes(proxyRes, req, res)

  //               expect(res.set.calledWith(
  //                 'content-disposition',
  //                 sinon.match((value) => value.endsWith('.obj"'))
  //               )).toBe(true)
  //             })

  //             it('finally, falls back to ".bin"', () => {
  //               const proxyRes = { headers: {} }

  //               proxyOptions.onProxyRes(proxyRes, req, res)

  //               expect(res.set.calledWith(
  //                 'content-disposition',
  //                 sinon.match((value) => value.endsWith('.bin"'))
  //               )).toBe(true)
  //             })
  //           })
  //         })
  //       })
  //     })

  //     it('passes error to next middleware', () => {
  //       const err = new Error()
  //       const res = { set: sinon.stub().throws(err) }

  //       proxyOptions.onProxyRes(proxyRes, req, res)

  //       expect(next.calledWith(err)).toBe(true)
  //     })
  //   })

  //   describe('pathRewrite', () => {
  //     it('returns the web resource URL path plus query', () => {
  //       const webResourceId = 'https://www.example.org/image.jpg?size=large'
  //       const proxyOptions = webResourceProxyOptions(webResourceId)

  //       expect(proxyOptions.pathRewrite()).toBe('/image.jpg?size=large')
  //     })
  //   })

  //   describe('target', () => {
  //     it('is set to the web resource URL origin', () => {
  //       const proxyOptions = webResourceProxyOptions(fixtures.webResourceId)

  //       expect(proxyOptions.target).toBe('https://www.example.org')
  //     })
  //   })
  // })
})
