import mongodb from 'mongodb'
import sinon from 'sinon'

const collectionStub = sinon.stub()
const findOneAggregationStub = sinon.stub().resolves({
  edmIsShownBy: 'https://www.example.org/edmIsShownBy.jpg',
  hasView: [],
  edmRights: {
    def: ['http://creativecommons.org/publicdomain/mark/1.0/']
  }
})
const findOneWebResourceStub = sinon.stub().resolves({
  about: 'https://www.example.org/edmIsShownBy.jpg'
})
collectionStub.withArgs('Aggregation').returns({
  findOne: findOneAggregationStub
})
collectionStub.withArgs('WebResource').returns({
  findOne: findOneWebResourceStub
})

class MongoClientStub {
  constructor() {
    return {
      db: sinon.stub().returns({
        collection: collectionStub
      })
    }
  }
}

sinon.stub(mongodb, 'MongoClient').get(() => MongoClientStub)

import MongoSource from '@/sources/mongodb.js'

const itemId = '/123/abc'
const webResourceId = 'https://www.example.org/edmIsShownBy.jpg'
const webResourceHash = '552149831861a7078565d5c5531e857c'

describe('@/sources/mongodb.js', () => {
  beforeAll(() => {

  })
  afterEach(sinon.resetHistory)

  describe('constructor', () => {
    it('connects to MongoDB', () => {
      const mongoSource = new MongoSource

      expect(mongoSource.mongoClient).toBeTruthy()
    })
  })

  describe('find', () => {
    it('queries the Aggregation collection for the provider aggregation', async () => {
      const mongoSource = new MongoSource

      await mongoSource.find(itemId, webResourceHash)
      console.log(mongoSource.mongoClient.db.called)
      console.log(findOneAggregationStub.getCalls()[0])
      expect(findOneAggregationStub.calledWith({ about: `/aggregation/provider${itemId}` })).toBe(true)
    })
  })
})
