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
  resHeadersToDrop: {
    'set-cookie': 'crumbly'
  },
  resHeadersToKeep: {
    etag: 'v1'
  },
  webResourceId: 'https://www.example.org/image.jpg',
  webResourceIdWithCharsEncoded: 'https://www.example.org/Te%C5%BEak.jpg',
  webResourceIdWithCharsToEncode: 'https://www.example.org/Težak.jpg'
}

describe('@/middlewares/web-resource-proxy.js', () => {
  const fetchResponseMock = {
    body: '',
    headers: new Headers({
      ...fixtures.resHeadersToDrop,
      ...fixtures.resHeadersToKeep
    }),
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
    const req = {
      headers: {
        ...fixtures.reqHeadersToKeep,
        ...fixtures.reqHeadersToDrop
      },
      params: { datasetId: '123', localId: 'abc', webResourceHash: 'd1299d035beb29c5b3b36e7f7c5c8610' },
      query: {},
      set: sinon.spy()
    }
    const res = {
      end: sinon.spy(),
      locals: { webResourceId: fixtures.webResourceId },
      redirect: sinon.spy(),
      set: sinon.spy(),
      status: sinon.spy()
    }
    const next = sinon.spy()

    describe('proxying incoming request upstream', () => {
      it('fetches upstream web resource', async () => {
        await webResourceProxyMiddleware(req, res, next)

        expect(global.fetch.getCalls().length).toBe(1)
        expect(global.fetch.getCalls()[0].args[0]).toBe(fixtures.webResourceId)
      })

      describe('proxied request', () => {
        it('proxies certain headers', async () => {
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
    })

    describe('sending proxied response downstream', () => {
      describe('when upstream resource is an HTML document', () => {
        beforeEach(() => {
          global.fetch.resolves({
            ...fetchResponseMock,
            headers: new Headers({
              ...fetchResponseMock.headers,
              'content-type': 'text/html'
            })
          })
        })

        it('302 redirects to it', async () => {
          await webResourceProxyMiddleware(req, res, next)

          expect(res.redirect.calledWith(302, fixtures.webResourceId)).toBe(true)
        })
      })

      describe('when upstream response is an http error', () => {
        beforeEach(() => {
          global.fetch.resolves({
            ...fetchResponseMock,
            ok: false,
            status: 404
          })
        })

        it('sends it to next', async () => {
          await webResourceProxyMiddleware(req, res, next)

          expect(next.calledWith(sinon.match((err) => err.status === 404))).toBe(true)
        })
      })

      describe('when fetch threw an error, e.g. ssl/network issue', () => {
        beforeEach(() => {
          global.fetch.rejects(new Error('Network error'))
        })

        it('sends a 502-status error to next', async () => {
          await webResourceProxyMiddleware(req, res, next)

          expect(next.calledWith(sinon.match((err) => err.status === 502))).toBe(true)
        })
      })

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

          console.log('res.set.getCalls', JSON.stringify(res.set.getCalls(), null, 2))
          expect(res.set.calledWith('x-europeana-web-resource', fixtures.webResourceIdWithCharsEncoded)).toBe(true)
        })
      })

      it('proxies certain headers', async () => {
        await webResourceProxyMiddleware(req, res, next)

        for (const name in fixtures.resHeadersToKeep) {
          expect(res.set.calledWith(name, fixtures.resHeadersToKeep[name])).toBe(true)
        }
      })

      it('drops other headers', async () => {
        await webResourceProxyMiddleware(req, res, next)

        for (const name in fixtures.resHeadersToDrop) {
          expect(res.set.calledWith(name, fixtures.resHeadersToDrop[name])).toBe(false)
        }
      })

      describe('content-type header', () => {
        it('first, uses upstream content-type if not "application/octet-stream"', async () => {
          global.fetch.resolves({
            ...fetchResponseMock,
            headers: new Headers({
              ...fetchResponseMock.headers,
              'content-type': 'image/png'
            })
          })

          await webResourceProxyMiddleware(req, res, next)

          expect(res.set.calledWith('content-type', 'image/png')).toBe(true)
        })

        it('second, is dervied from upstream content-disposition if present', async () => {
          global.fetch.resolves({
            ...fetchResponseMock,
            headers: new Headers({
              ...fetchResponseMock.headers,
              'content-disposition': 'attachment; filename="model.obj"',
              'content-type': 'application/octet-stream'
            })
          })

          await webResourceProxyMiddleware(req, res, next)

          expect(res.set.calledWith('content-type', 'model/obj')).toBe(true)
        })

        it('last, falls back to "application/octet-stream"', async () => {
          await webResourceProxyMiddleware(req, res, next)

          expect(res.set.calledWith('content-type', 'application/octet-stream')).toBe(true)
        })
      })

      describe('content-disposition response header', () => {
        it('defaults to "attachment"', async () => {
          global.fetch.resolves({
            ...fetchResponseMock,
            headers: new Headers({
              ...fetchResponseMock.headers,
              'content-type': 'image/jpeg'
            })
          })

          await webResourceProxyMiddleware(req, res, next)

          expect(res.set.calledWith(
            'content-disposition',
            sinon.match((value) => value.startsWith('attachment; '))
          )).toBe(true)
        })

        describe('with disposition=inline in request query', () => {
          it('is "inline"', async () => {
            global.fetch.resolves({
              ...fetchResponseMock,
              headers: new Headers({
                ...fetchResponseMock.headers,
                'content-type': 'image/jpeg'
              })
            })

            await webResourceProxyMiddleware({ ...req, query: { disposition: 'inline' } }, res, next)

            expect(res.set.calledWith(
              'content-disposition',
              sinon.match((value) => value.startsWith('inline; '))
            )).toBe(true)
          })
        })

        describe('filename', () => {
          describe('basename', () => {
            it('is derived from request parameters', async () => {
              global.fetch.resolves({
                ...fetchResponseMock,
                headers: new Headers({
                  ...fetchResponseMock.headers,
                  'content-type': 'image/jpeg'
                })
              })

              await webResourceProxyMiddleware(req, res, next)

              expect(res.set.calledWith(
                'content-disposition',
                sinon.match((value) => value.includes('filename="Europeana.eu-123-abc-d1299d035beb29c5b3b36e7f7c5c8610'))
              )).toBe(true)
            })
          })

          describe('extension', () => {
            it('first, is taken from upstream content-type header', async () => {
              global.fetch.resolves({
                ...fetchResponseMock,
                headers: new Headers({
                  ...fetchResponseMock.headers,
                  'content-type': 'image/jpeg'
                })
              })

              await webResourceProxyMiddleware(req, res, next)

              expect(res.set.calledWith(
                'content-disposition',
                sinon.match((value) => value.endsWith('.jpeg"'))
              )).toBe(true)
            })

            it('second, is dervied from upstream content-disposition header', async () => {
              global.fetch.resolves({
                ...fetchResponseMock,
                headers: new Headers({
                  ...fetchResponseMock.headers,
                  'content-disposition': 'attachment; filename="model.obj"'
                })
              })

              await webResourceProxyMiddleware(req, res, next)

              expect(res.set.calledWith(
                'content-disposition',
                sinon.match((value) => value.endsWith('.obj"'))
              )).toBe(true)
            })

            it('finally, falls back to ".bin"', async () => {
              await webResourceProxyMiddleware(req, res, next)

              expect(res.set.calledWith(
                'content-disposition',
                sinon.match((value) => value.endsWith('.bin"'))
              )).toBe(true)
            })
          })
        })
      })
    })
  })

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
})
