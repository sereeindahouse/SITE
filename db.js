const dotenv = require('dotenv');
dotenv.config();
const { MongoClient } = require('mongodb');

const uri = process.env.CONNECT_STRING;
if (!uri) {
  console.error('Missing CONNECT_STRING in .env');
  process.exit(1);
}

const DB_NAME = process.env.DB_NAME || 'MagnusKS';

// Create client and export DB immediately so models can call require('../db').collection(...)
const client = new MongoClient(uri, {
  serverApi: { version: '1' },
  connectTimeoutMS: 20000,
  socketTimeoutMS: 45000
});
const db = client.db(DB_NAME);
module.exports = db;

(async function start() {
  try {
    await client.connect();
    await db.command({ ping: 1 });
    console.log('✅ DB connected');
    const app = require('./app');
    const port = process.env.PORT || 8080;
    app.listen(port, () => console.log('server started at', port));
  } catch (err) {
    console.error('DB connection error:', err);
    process.exit(1);
  }
})();