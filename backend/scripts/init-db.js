// Loads schema.sql into the database from DATABASE_URL
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query(fs.readFileSync(path.join(__dirname, '../src/schema.sql'), 'utf8'));
  await c.end();
  console.log('Schema loaded + sample products inserted. Ready!');
})().catch((e) => {
  console.error('DB init failed:', e.message);
  process.exit(1);
});
