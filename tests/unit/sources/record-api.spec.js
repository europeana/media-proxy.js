import axios from 'axios'
import sinon from 'sinon'

const axiosInstanceStub = sinon.stub()
const axiosCreateStub = sinon.stub(axios, 'create').returns(axiosInstanceStub)

const config = {
  apiKey: 'API_KEY',
  apiUrl: 'https://api.example.org/record',
  permittedApiUrls: ['https://api.example.org/record', 'https://api2.example.org/record']
}

import RecordApiSource from '@/sources/record-api.js'

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

fixtures.recordApiResponse = {
  data: {
    object: {
      aggregations: [
        {
          about: fixtures.providerAggregationId,
          edmIsShownBy: fixtures.edmIsShownById,
          edmRights: { def: [fixtures.edmRights] },
          webResources: [
            { about: fixtures.edmIsShownById },
            { about: fixtures.edmHasViewId, webResourceEdmRights: { def: [fixtures.webResourceEdmRights] } }
          ]
        }
      ]
    }
  }
}

describe('@/sources/record-api.js', () => {
  afterEach(() => {
    axiosInstanceStub.reset()
    sinon.resetHistory()
  })
  afterAll(sinon.restore)

  describe('constructor', () => {
    describe('without an API URL specified', () => {
      it('creates an axios instance with default URL', () => {
        new RecordApiSource(config)

        expect(axiosCreateStub.calledWith({
          baseURL: config.apiUrl,
          httpAgent: sinon.match.object,
          httpsAgent: sinon.match.object,
          params: {
            wskey: config.apiKey
          },
          timeout: 10000
        })).toBe(true)
      })
    })

    describe('with a permitted API URL specified', () => {
      it('creates an axios instance with specified URL', () => {
        new RecordApiSource(config, config.permittedApiUrls[1])

        expect(axiosCreateStub.calledWith({
          baseURL: config.permittedApiUrls[1],
          httpAgent: sinon.match.object,
          httpsAgent: sinon.match.object,
          params: {
            wskey: config.apiKey
          },
          timeout: 10000
        })).toBe(true)
      })
    })

    describe('with an unpermitted API URL specified', () => {
      it('throws an "Unauthorised API URL" error', () => {
        expect(() => {
          new RecordApiSource(config, 'https://unpermitted.example.org/record')
        }).toThrow('Unauthorised API URL')
        expect(axiosCreateStub.called).toBe(false)
      })
    })
  })

  describe('find', () => {
    const recordApiSource = new RecordApiSource(config)

    describe('when the Record API responds with a 404 error', () => {
      it('returns null', async () => {
        axiosInstanceStub.throws({
          response: { status: 404 }
        })
        const webResource = await recordApiSource.find(fixtures.itemId, fixtures.edmIsShownByHash)

        expect(webResource).toBe(null)
      })
    })

    describe('when the Record API responds with a non-404 error', () => {
      it('throws the error', async () => {
        axiosInstanceStub.throws({ message: 'Network error' })

        let error
        try {
          await recordApiSource.find(fixtures.itemId, fixtures.edmIsShownByHash)
        } catch (e) {
          error = e
        }

        expect(error.message).toBe('Network error')
      })
    })

    describe('when `webResourceHash` is specified', () => {
      describe('but is not present on provider aggregation\'s web resources', () => {
        it('returns null', async () => {
          axiosInstanceStub.returns(fixtures.recordApiResponse)

          const webResource = await recordApiSource.find(fixtures.itemId, 'nope')

          expect(webResource).toBe(null)
        })
      })

      describe('and is present on provider aggregation\'s web resources', () => {
        it('returns the web resource object', async () => {
          axiosInstanceStub.returns(fixtures.recordApiResponse)

          const webResource = await recordApiSource.find(fixtures.itemId, fixtures.edmHasViewHash)

          expect(webResource.id).toBe(fixtures.edmHasViewId)
        })
      })
    })

    describe('when `webResourceHash` is not specified', () => {
      describe('and there is no edm:isShownBy', () => {
        test.todo('returns null')
      })

      describe('and there is an edm:isShownBy', () => {
        it('returns the web resource object', async () => {
          axiosInstanceStub.returns(fixtures.recordApiResponse)

          const webResource = await recordApiSource.find(fixtures.itemId)

          expect(webResource.id).toBe(fixtures.edmIsShownById)
        })
      })
    })
  })
})
