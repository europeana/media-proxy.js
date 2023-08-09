import sourcesIndex from '@/sources/index.js'
import MongoSource from '@/sources/mongodb.js'
import RecordApiSource from '@/sources/record-api.js'

describe('@/sources/index.js', () => {
  describe('configured', () => {
    describe('when config specifies Record API data source', () => {
      const config = {
        app: {
          dataSource: 'record-api'
        },
        europeana: {
          apiUrl: 'https://api.example.org/record'
        }
      }

      it('returns an instance of RecordApiSource', () => {
        const configured = sourcesIndex.configured(config)

        expect(configured instanceof RecordApiSource).toBe(true)
      })
    })

    describe('when config specifies MongoDB data source', () => {
      const config = {
        app: {
          dataSource: 'mongodb'
        },
        mongodb: {}
      }

      it('returns an instance of MongoSource', () => {
        const configured = sourcesIndex.configured(config)

        expect(configured instanceof MongoSource).toBe(true)
      })
    })
  })

  describe('requested', () => {
    test.todo('returns a per-request API if specified in query')
  })
})
