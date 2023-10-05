import sinon from 'sinon'

import dataSources from '@/sources/index.js'

const requestedDataSourceStub = sinon.stub(dataSources, 'requested')

import mediaRoute from '@/routes/media.js'

describe('@/routes/media.js', () => {
  afterEach(sinon.reset)
  afterAll(sinon.restore)

  describe('when data source lookup throws error', () => {
    it('calls next', async () => {
      let err
      requestedDataSourceStub.throws(() => {
        err = new Error('Unauthorised API URL')
        return err
      })
      const req = {}
      const res = { sendStatus: sinon.spy() }
      const next = sinon.spy()

      await mediaRoute({})(req, res, next)

      expect(next.calledWith(err)).toBe(true)
    })
  })

  describe('when web resource is not found in data source', () => {
    it('sends 404 error', async () => {
      requestedDataSourceStub.returns({ find: async () => null })
      const req = { params: {} }
      const res = { sendStatus: sinon.spy() }
      const next = sinon.spy()

      await mediaRoute({})(req, res, next)

      expect(next.calledWith(sinon.match((err) => err.status === 404))).toBe(true)
    })
  })

  describe('when there was no web resource hash in the request query', () => {
    it('redirects with 302 to the path including the hash, preserving query', async () => {
      requestedDataSourceStub.returns({ find: async () => ({ edmRights: '/PD/', id: 'https://example.org/image.jpeg' }) })
      const req = { params: { datasetId: '123', localId: 'abc' }, query: { disposition: 'inline' } }
      const res = { redirect: sinon.spy() }

      await mediaRoute({})(req, res)

      expect(res.redirect.calledWith(302, '/media/123/abc/d1299d035beb29c5b3b36e7f7c5c8610?disposition=inline')).toBe(true)
    })
  })

  describe('when valid web resource hash is in the request query', () => {
    const webResourceId = 'https://example.org/image.jpeg'
    const req = {
      params: { datasetId: '123', localId: 'abc', webResourceHash: 'd1299d035beb29c5b3b36e7f7c5c8610' },
      query: { disposition: 'inline' }
    }
    const res = { locals: {}, redirect: sinon.spy() }
    const next = sinon.spy()

    beforeEach(() => {
      requestedDataSourceStub.returns({
        find: async () => ({ edmRights: '/PD/', id: webResourceId })
      })
    })

    it('set web resource ID on res.locals', async () => {
      await mediaRoute({})(req, res, next)

      expect(res.locals.webResourceId).toBe(webResourceId)
    })

    it('calls next', async () => {
      await mediaRoute({})(req, res, next)

      expect(next.called).toBe(true)
    })
  })
})
