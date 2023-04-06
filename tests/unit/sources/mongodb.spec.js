import sinon from 'sinon'

import MongoSource from '@/sources/mongodb.js'

const fixtures = {
  edmHasViewHash: 'a3db142ec56024dd8e409d85161d8315',
  edmHasViewId: 'https://www.example.org/edmHasView.jpg',
  edmIsShownByHash: '552149831861a7078565d5c5531e857c',
  edmIsShownById: 'https://www.example.org/edmIsShownBy.jpg',
  edmRights: 'http://creativecommons.org/publicdomain/mark/1.0/',
  itemId: '/123/abc',
  providerAggregationId: '/aggregation/provider/123/abc',
  webResourceEdmRights: 'http://creativecommons.org/licenses/by/4.0/'
}

const findOneAggregationStub = sinon.stub().resolves({
  edmIsShownBy: fixtures.edmIsShownById,
  edmRights: {
    def: [fixtures.edmRights]
  },
  hasView: [fixtures.edmHasViewId]
})
const findOneWebResourceStub = sinon.stub()
findOneWebResourceStub.withArgs({ about: fixtures.edmIsShownById }).resolves({
  about: fixtures.edmIsShownById
})
findOneWebResourceStub.withArgs({ about: fixtures.edmHasViewId }).resolves({
  about: fixtures.edmHasViewId,
  webResourceEdmRights: {
    def: [fixtures.webResourceEdmRights]
  }
})

class MongoClientStub {
  db () {
    const collectionStub = sinon.stub()
    collectionStub.withArgs('Aggregation').returns({
      findOne: findOneAggregationStub
    })
    collectionStub.withArgs('WebResource').returns({
      findOne: findOneWebResourceStub
    })

    return {
      collection: collectionStub
    }
  }
}

describe('@/sources/mongodb.js', () => {
  afterEach(sinon.resetHistory)

  describe('constructor', () => {
    it('stores client if supplied to MongoDB', () => {
      const mongoSource = new MongoSource(new MongoClientStub)

      expect(mongoSource.mongoClient).toBeTruthy()
    })
  })

  describe('find', () => {
    it('queries the Aggregation collection for the provider aggregation', async () => {
      const mongoSource = new MongoSource(new MongoClientStub)

      await mongoSource.find(fixtures.itemId)

      expect(findOneAggregationStub.calledWith({ about: fixtures.providerAggregationId })).toBe(true)
    })

    it('queries the WebResource collection for the web resource', async () => {
      const mongoSource = new MongoSource(new MongoClientStub)

      await mongoSource.find(fixtures.itemId)

      expect(findOneWebResourceStub.calledWith({ about: fixtures.edmIsShownById })).toBe(true)
    })

    describe('web resource selection', () => {
      describe('when no web resource hash is supplied', () => {
        it('selects the edm:isShownBy', async () => {
          const mongoSource = new MongoSource(new MongoClientStub)

          const webResource = await mongoSource.find(fixtures.itemId)

          expect(webResource.id).toBe(fixtures.edmIsShownById)
        })
      })

      describe('when the edm:isShownBy web resource hash is supplied', () => {
        it('selects the edm:isShownBy', async () => {
          const mongoSource = new MongoSource(new MongoClientStub)

          const webResource = await mongoSource.find(fixtures.itemId, fixtures.edmIsShownByHash)

          expect(webResource.id).toBe(fixtures.edmIsShownById)
        })
      })

      describe('when the edm:hasView web resource hash is supplied', () => {
        it('selects the edm:hasView', async () => {
          const mongoSource = new MongoSource(new MongoClientStub)

          const webResource = await mongoSource.find(fixtures.itemId, fixtures.edmHasViewHash)

          expect(webResource.id).toBe(fixtures.edmHasViewId)
        })
      })

      describe('when an unknown hash is supplied', () => {
        it('returns `null`', async () => {
          const mongoSource = new MongoSource(new MongoClientStub)

          const webResource = await mongoSource.find(fixtures.itemId, fixtures.edmHasViewHash.slice(1))

          expect(webResource).toBeNull()
        })
      })
    })

    describe('edm:rights selection', () => {
      describe('when the web resource has its own edm:rights', () => {
        it('selects the web resource edm:rights', async () => {
          const mongoSource = new MongoSource(new MongoClientStub)

          const webResource = await mongoSource.find(fixtures.itemId, fixtures.edmHasViewHash)

          expect(webResource.edmRights).toBe(fixtures.webResourceEdmRights)
        })
      })

      describe('when the web resource does not have its own edm:rights', () => {
        it('selects the aggregation edm:rights', async () => {
          const mongoSource = new MongoSource(new MongoClientStub)

          const webResource = await mongoSource.find(fixtures.itemId, fixtures.edmIsShownByHash)

          expect(webResource.edmRights).toBe(fixtures.edmRights)
        })
      })
    })
  })
})
