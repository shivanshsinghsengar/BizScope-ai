const http = require('http');

const data = JSON.stringify({ location: 'Delhi, India' });
const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/analyze-location',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    try {
      const json = JSON.parse(d);
      console.log('Business count:', json.businesses.length);
      console.log('First 5 businesses:');
      console.log(JSON.stringify(json.businesses.slice(0, 5).map(b => ({
        name: b.name,
        category: b.category,
        address: b.address
      })), null, 2));
    } catch (e) {
      console.error('Parse error:', e);
      console.log(d);
    }
  });
});

req.on('error', e => console.error('Request error:', e));
req.write(data);
req.end();