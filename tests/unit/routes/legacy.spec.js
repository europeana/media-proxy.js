import sinon from 'sinon'

import legacyRoute from '@/routes/legacy.js'

describe('@/routes/legacy.js', () => {
  it('301 redirects to equivalent /media route', () => {
    const req = { params: { datasetId: '123', localId: 'abc' } }
    const res = { redirect: sinon.spy() }

    legacyRoute(req, res)

    expect(res.redirect.calledWith(301, '/media/123/abc')).toBe(true)
  })

  it('converts `view` query param to web resource hash in path', () => {
    const req = {
      params: { datasetId: '123', localId: 'abc' },
      query: { view: 'https://www.example.org/edmIsShownBy.jpg' }
    }
    const res = { redirect: sinon.spy() }

    legacyRoute(req, res)

    expect(res.redirect.calledWith(301, '/media/123/abc/552149831861a7078565d5c5531e857c')).toBe(true)
  })

  it('converts `api_url` query param to `recordApiUrl`, rewriting /api to /record', () => {
    const req = {
      params: { datasetId: '123', localId: 'abc' },
      query: { 'api_url': 'https://api.example.org/api' }
    }
    const res = { redirect: sinon.spy() }

    legacyRoute(req, res)

    expect(res.redirect.calledWith(301, '/media/123/abc?recordApiUrl=https%3A%2F%2Fapi.example.org%2Frecord')).toBe(true)
  })

  it('preserves other query params', () => {
    const req = {
      params: { datasetId: '123', localId: 'abc' },
      query: { profile: 'debug' }
    }
    const res = { redirect: sinon.spy() }

    legacyRoute(req, res)

    expect(res.redirect.calledWith(301, '/media/123/abc?profile=debug')).toBe(true)
  })
})
