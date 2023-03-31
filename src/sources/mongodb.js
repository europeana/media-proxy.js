import { MongoClient } from 'mongodb'
import md5 from 'md5'
import config from '../config.js'

let mongoClient

export default async (itemId, webResourceHash) => {
  if (!mongoClient) {
    mongoClient = new MongoClient(config.mongodb.uri)
  }

  const mongoDb = mongoClient.db(config.mongodb.database)
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
