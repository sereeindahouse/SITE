const dotenv = require("dotenv");
dotenv.config();
const { MongoClient } = require("mongodb");

const uri = process.env.CONNECT_STRING;
if (!uri) {
  console.error("Missing CONNECT_STRING in .env");
  process.exit(1);
}

// Do not force TLS: the driver will negotiate TLS for Atlas (mongodb+srv) and skip it for local mongodb:// URIs.
const client = new MongoClient(uri);

async function start() {
  try {
    await client.connect();
    console.log("DB connected");
    const db = client.db(process.env.DB_NAME || "MagnusKS");
    module.exports = db;

    const app = require("./app");
    const port = process.env.PORT || 8080;
    app.listen(port, () => {
      console.log("server started at", port);
    });
  } catch (err) {
    console.error("DB connection error:", err);
    process.exit(1);
  }
}

start();