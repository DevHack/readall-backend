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
            const authors = await db.collection(COLLECTION_NAME).aggregate([
                {
                  '$search': {
                    'index': 'author-autocomplete', 
                    'autocomplete': {
                      'query': `${event.queryStringParameters.term}`, 
                      'path': 'name'
                    },
                    'highlight':{
                        'path': 'name'
                    }
                  }
                }, {
                  '$limit': 10
                }, {
                  '$project': {
                    'name': 1, 
                    'span': 1, 
                    'authorId': 1, 
                    '_id': 0,
                    'highlights': { "$meta": "searchHighlights" }
                  }
                }
            ]).toArray();
            response = {
                'statusCode': 200,
                'body': JSON.stringify({
                    message: 'hello from readall'+event.httpMethod,
                    data: authors
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
            const newAuthor = {
                authorId: uuidv4(),
                name: reqBody.name,
                span: reqBody.span || '',
                books: [],
                PAN: reqBody.PAN || '',
                bankAcNumber: reqBody.bankAcNumber || '',
                IFSC: reqBody.IFSC || ''
            }
            const authors = await db.collection(COLLECTION_NAME).insert(newAuthor);
            console.log(JSON.stringify(event));
            response = {
                'statusCode': 200,
                'body': JSON.stringify({
                    message: 'Author created',
                    data: {_id: authors.insertedIds["0"], ...newAuthor}
                })
            }
        }
        
    } catch (err) {
        console.log(err);
        return err;
    }

    return response
};