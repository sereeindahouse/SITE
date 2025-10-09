#!/usr/bin/env node
require('dotenv').config();
const dns = require('dns').promises;
const { MongoClient } = require('mongodb');

(async () => {
  const uri = process.env.CONNECT_STRING;
  if (!uri) {
    console.error('Missing CONNECT_STRING');
    process.exit(1);
  }
  console.log('--- DIAGNOSE START ---');
  try {
    const srvHost = uri.match(/@([^/]+)\//)[1];
    console.log('SRV host:', srvHost);
    const srvRecords = await dns.resolveSrv(`_mongodb._tcp.${srvHost}`);
    console.log('SRV records:', srvRecords.map(r => `${r.name}:${r.port}`).join(', '));
  } catch (e) {
    console.warn('SRV lookup failed:', e.message);
  }

  try {
    const client = new MongoClient(uri, { serverApi: { version: '1' }, connectTimeoutMS: 15000 });
    const start = Date.now();
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    console.log('Ping ok in', Date.now() - start, 'ms');
    await client.close();
  } catch (e) {
    console.error('Connection test failed:', e.message);
  }
  console.log('--- DIAGNOSE END ---');
})();
