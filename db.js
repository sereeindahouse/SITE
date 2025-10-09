const dotenv = require('dotenv');
dotenv.config();
const { MongoClient } = require('mongodb');

const uri = process.env.CONNECT_STRING;
if (!uri) {
  console.error('Missing CONNECT_STRING in .env');
  process.exit(1);
}

const debug = process.env.DEBUG_DB === '1' || process.env.DEBUG_DB === 'true';
if (debug) {
  try {
    const masked = uri.replace(/:\w+@/, ':****@');
    console.log('[DB DEBUG] Using URI host:', masked.split('@')[1].split('/')[0]);
  } catch (_) {}
}

// Configure client with Stable API & timeouts (helps with TLS handshake clarity on cold starts)
const client = new MongoClient(uri, {
  serverApi: { version: '1', strict: true, deprecationErrors: true },
  connectTimeoutMS: 20000,
  socketTimeoutMS: 45000
});

async function start() {
  try {
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    console.log('✅ MongoDB connected & ping successful');
    if (debug) {
      const topo = client.topology.s.description; // internal but ok for debug
      console.log('[DB DEBUG] Topology type:', topo.type);
      for (const [addr, desc] of topo.servers) {
        console.log('[DB DEBUG] Server:', addr, 'state=', desc.type, 'latencyMs=', desc.roundTripTime);
      }
    }
    const db = client.db(process.env.DB_NAME || 'MagnusKS');
    module.exports = db;

    const app = require('./app');
    const port = process.env.PORT || 8080;
    app.listen(port, () => {
      console.log('server started at', port);
    });
  } catch (err) {
    console.error('DB connection error:');
    if (err && err.message && err.message.includes('SSL routines')) {
      console.error('• TLS handshake failed. Check:');
      console.error('  - Atlas Network Access (IP whitelist)');
      console.error('  - Correct SRV URI with trailing /?');
      console.error('  - Password URL-encoding (if special chars)');
      console.error('  - Cluster not paused');
    }
    console.error(err);
    process.exit(1);
  }
}

start();