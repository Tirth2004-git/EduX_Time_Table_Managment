const http = require('http');

const data = JSON.stringify({
  email: 'admin@edux.com',
  password: 'Admin@123'
});

const options = {
  hostname: '127.0.0.1',
  port: 8000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  res.on('end', () => {
    console.log(`RESPONSE: ${responseData}`);
    if (res.headers['set-cookie']) {
      console.log('Set-Cookie:', res.headers['set-cookie']);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
