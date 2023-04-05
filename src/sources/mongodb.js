import { MongoClient } from 'mongodb'
import md5 from 'md5'
import config from '../config.js'

export default class MongoSource {
  constructor() {
    this.mongoClient = new MongoClient(config.mongodb.uri)
  }

  async find (itemId, webResourceHash) {
    const mongoDb = this.mongoClient.db(config.mongodb.database)

    const aggregation = await mongoDb.collection('Aggregation')
      .findOne({ about: `/aggregation/provider${itemId}` })

    let webResourceId
    if (webResourceHash) {
      webResourceId = [aggregation.edmIsShownBy].concat(aggregation.hasView)
        .find((wr) => md5(wr) === webResourceHash)
    } else {
      webResourceId = aggregation.edmIsShownBy
    }

    if (!webResourceId) {
      return null
    }

    let edmRights = aggregation.edmRights.def[0]

    const webResourceDoc = await mongoDb.collection('WebResource')
      .findOne({ about: webResourceId })
    if (webResourceDoc?.webResourceEdmRights) {
      edmRights = webResourceDoc.webResourceEdmRights.def[0]
    }

    return {
      edmRights,
      id: webResourceId
    }
  }
}
