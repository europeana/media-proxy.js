import sinon from 'sinon'

import dataSources from '@/sources/index.js'

const requestedDataSourceStub = sinon.stub(dataSources, 'requested')

import mediaRoute from '@/routes/media.js'

describe('@/routes/media.js', () => {
  afterEach(sinon.reset)
  afterAll(sinon.restore)

  describe('when data source lookup throws "Unauthorised API URL" error', () => {
    it('sends status 403', async () => {
      requestedDataSourceStub.throws(() => {
        return new Error('Unauthorised API URL')
      })
      const req = {}
      const res = { sendStatus: sinon.spy() }

      await mediaRoute(req, res)

      expect(res.sendStatus.calledWith(403)).toBe(true)
    })
  })

  describe('when web resource is not found in data source', () => {
    it('sends status 404', async () => {
      requestedDataSourceStub.returns({ find: async () => null })
      const req = { params: {} }
      const res = { sendStatus: sinon.spy() }

      await mediaRoute(req, res)

      expect(res.sendStatus.calledWith(404)).toBe(true)
    })
  })

  describe('when web resource has In Copyright edm:rights', () => {
    it('sends status 403', async () => {
      requestedDataSourceStub.returns({ find: async () => ({ edmRights: '/InC/' }) })
      const req = { params: {} }
      const res = { sendStatus: sinon.spy() }

      await mediaRoute(req, res)

      expect(res.sendStatus.calledWith(403)).toBe(true)
    })
  })

  describe('when there was no web resource hash in the request query', () => {
    it('redirects with 302 to the path including the hash, preserving query', async () => {
      requestedDataSourceStub.returns({ find: async () => ({ edmRights: '/PD/', id: 'https://example.org/image/jpeg' }) })
      const req = { params: { datasetId: '123', localId: 'abc' }, query: { disposition: 'inline' } }
      const res = { redirect: sinon.spy() }

      await mediaRoute(req, res)

      expect(res.redirect.calledWith(302, '/media/123/abc/dea05b2e6152b57772872b63af7ccab1?disposition=inline')).toBe(true)
    })
  })
})
