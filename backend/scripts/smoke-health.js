/* eslint-disable no-console */
const base = process.env.API_URL || 'http://localhost:5000';

async function run() {
  const url = `${base}/api/health`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  const data = await res.json();
  if (!data.status || !data.timestamp) {
    throw new Error('Health payload missing required fields');
  }
  console.log('Health check OK:', JSON.stringify({ status: data.status, database: data.database, uptimeSeconds: data.uptimeSeconds }, null, 2));
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
