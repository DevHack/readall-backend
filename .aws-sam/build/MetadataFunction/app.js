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
        if(event.httpMethod && event.httpMethod.toLowerCase() === 'get'){
            console.log(JSON.stringify(event))
            const metadata = await db.collection(COLLECTION_NAME).aggregate([
                {
                  '$search': {
                    'index': 'meta-autocomplete', 
                    'autocomplete': {
                      'query': `${event.queryStringParameters.term}`, 
                      'path': 'name'
                    }
                  }
                }, {
                  '$limit': 10
                }, {
                  '$project': {
                    'name': 1,
                    '_id': 1
                  }
                }
            ]).toArray();
            response = {
                'statusCode': 200,
                'body': JSON.stringify({
                    message: 'Metadata autocomplete',
                    data: metadata
                })
            }
        }else if(event.httpMethod && event.httpMethod.toLowerCase() === 'post'){
            const reqBody = JSON.parse(event.body);
            if(!reqBody || !reqBody.name){
                return response = {
                    'statusCode': 403,
                    'body': JSON.stringify({
                        message: 'missing required parameter name'
                    })
                }
            }
            const newMetadata = {
                name: reqBody.name
            }
            const metadata = await db.collection(COLLECTION_NAME).insert(newMetadata);
            console.log(JSON.stringify(event));
            response = {
                'statusCode': 200,
                'body': JSON.stringify({
                    message: 'Metadata created',
                    data: {_id: metadata.insertedIds["0"], ...newMetadata}
                })
            }
        }
        
    } catch (err) {
        console.log(err);
        return err;
    }

    return response;
};