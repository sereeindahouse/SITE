const dotenv = require("dotenv");
dotenv.config();
const { MongoClient } = require("mongodb");

const uri = process.env.CONNECT_STRING;
if (!uri) {
  console.error("Missing CONNECT_STRING in .env");
  process.exit(1);
}

// Configure MongoClient for Atlas Stable API (helps with forward compatibility)
const client = new MongoClient(uri, {
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true
  },
  // Defensive timeouts (Render free tier can be slow cold-starting)
  connectTimeoutMS: 20000,
  socketTimeoutMS: 45000
});

async function start() {
  try {
  await client.connect();
  // Simple ping to verify primary selection; surfaces TLS / network issues early
  await client.db('admin').command({ ping: 1 });
  console.log("✅ MongoDB connected & ping successful");
    const db = client.db(process.env.DB_NAME || "MagnusKS");
    module.exports = db;

    const app = require("./app");
    const port = process.env.PORT || 8080;
    app.listen(port, () => {
      console.log("server started at", port);
    });
  } catch (err) {
    console.error("DB connection error:");
    // Provide concise helpful hints for common Atlas TLS errors
    if (err && err.message && err.message.includes('SSL routines')) {
      console.error('• TLS error detected. Possible causes:');
      console.error('  - Incorrect SRV URI (missing trailing /?)');
      console.error('  - Password contains special characters not URL-encoded');
      console.error('  - Local network / hosting provider blocking TLS handshake');
      console.error('  - IP not allowed in Atlas Network Access');
    }
    console.error(err);
    process.exit(1);
  }
}

start();