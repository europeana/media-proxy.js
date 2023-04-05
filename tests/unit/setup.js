// import mongodb from 'mongodb'
// import sinon from 'sinon'
//
// class MongoClientStub {
//   constructor() {
//     const collectionStub = sinon.stub()
//     collectionStub.withArgs('Aggregation').returns({
//       findOne: sinon.stub().resolves({
//         edmIsShownBy: 'https://www.example.org/edmIsShownBy.jpg',
//         hasView: [],
//         edmRights: {
//           def: ['http://creativecommons.org/publicdomain/mark/1.0/']
//         }
//       })
//     })
//     collectionStub.withArgs('WebResource').returns({
//       findOne: sinon.stub().resolves({
//         about: 'https://www.example.org/edmIsShownBy.jpg'
//       })
//     })
//
//     return {
//       db: sinon.stub().returns({
//         collection: collectionStub
//       })
//     }
//   }
// }
//
// sinon.stub(mongodb, 'MongoClient').get(() => MongoClientStub)
