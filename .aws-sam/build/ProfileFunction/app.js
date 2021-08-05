let response;
const MongoClient = require("mongodb").MongoClient;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGO_DB_NAME;
const COLLECTION_NAME = process.env.MONGO_COLLECTION_NAME;
// Once we connect to the database once, we'll store that connection and reuse it so that we don't have to connect to the database on every request.
let cachedDb = null;
const { v4: uuidv4 } = require('uuid');
async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  // Connect to our MongoDB database hosted on MongoDB Atlas
  const client = await MongoClient.connect(MONGODB_URI);
  // Specify which database we want to use
  const db = await client.db(DB_NAME);
  cachedDb = db;
  return db;
}


exports.lambdaHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    const db = await connectToDatabase();
    if (event.httpMethod && event.httpMethod.toLowerCase() === 'get') {
      const user = await db.collection(COLLECTION_NAME).findOne({ userId: event.pathParameters.userId });
      console.log(JSON.stringify(user));
      response = {
        'statusCode': 200,
        'body': JSON.stringify({
          message: 'profile information for userId' + event.pathParameters.userId,
          data: user || {}
        })
      }
    }
    else if (event.httpMethod && event.httpMethod.toLowerCase() === 'post') {
      const reqBody = JSON.parse(event.body);
      if (!reqBody || !reqBody.role || !reqBody.userId) {
        return response = {
          'statusCode': 403,
          'body': JSON.stringify({
            message: 'missing required parameter role/userId'
          })
        }
      }

      switch (reqBody.role) {
        case 'publisher':
          if (!reqBody.phone
          || !reqBody.publishingHouseName 
          || !reqBody.yearOfInception 
          || !reqBody.totalTitlesPublished
          || !reqBody.PAN 
          || !reqBody.bankAcNumber
          || !reqBody.IFSC){
            return response = {
              'statusCode': 403,
              'body': JSON.stringify({
                message: 'missing required parameter for role publisher [phone, publishingHouseName, yearOfInception, totalTitlesPublished, PAN, bankAcNumber, IFSC ]'
              })
            }
          }
          break;
        case 'author':
          if (!reqBody.phone
            || !reqBody.PAN 
            || !reqBody.bankAcNumber
            || !reqBody.IFSC){
              return response = {
                'statusCode': 403,
                'body': JSON.stringify({
                  message: 'missing required parameter for role author [phone, PAN, bankAcNumber, IFSC ]'
                })
              }
            }
            break;
        case 'reader' : 
        if (!reqBody.languagePreference 
          || !reqBody.languagePreference.length){
            return response = {
              'statusCode': 403,
              'body': JSON.stringify({
                message: 'missing required parameter for role reader [languagePreference]'
              })
            }
          }
          break;
        }
      //     if(!reqBody || !reqBody.name){
      //         return response = {
      //             'statusCode': 403,
      //             'body': JSON.stringify({
      //                 message: 'missing required parameter name'
      //             })
      //         }
      //     }
      //     const newAuthor = {
      //         authorId: uuidv4(),
      //         name: reqBody.name,
      //         span: reqBody.span || '',
      //         books: [],
      //         PAN: reqBody.PAN || '',
      //         bankAcNumber: reqBody.bankAcNumber || '',
      //         IFSC: reqBody.IFSC || ''
      //     }
          const profilePut = await db.collection(COLLECTION_NAME).insert(reqBody);
          console.log(JSON.stringify(event));
          response = {
              'statusCode': 200,
              'body': JSON.stringify({
                  message: `new profile created for userId: ${reqBody.userId} with role: ${reqBody.role} `,
                  data: {_id: profilePut.insertedId, ...reqBody}
              })
          }
    }

  } catch (err) {
    console.log(err);
    return err;
  }

  return response
};