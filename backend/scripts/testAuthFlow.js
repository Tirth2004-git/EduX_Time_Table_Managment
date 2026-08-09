const http = require('http');

async function testLogin(email, password, description) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ email, password });
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
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        console.log(`\n--- Test: ${description} ---`);
        console.log(`Email: ${email} | Password: ${password}`);
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`RESPONSE: ${responseData}`);
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`Problem with request: ${e.message}`);
      resolve();
    });

    req.write(data);
    req.end();
  });
}

async function runTests() {
  await testLogin('admin@edux.com', 'Admin@123', 'Correct email + correct password (Admin)');
  await testLogin('teacher@edux.com', 'Teacher@123', 'Correct email + correct password (Teacher)');
  await testLogin('student@edux.com', 'Student@123', 'Correct email + correct password (Student)');
  await testLogin('admin@edux.com', 'WrongPass', 'Correct email + wrong password');
  await testLogin('missing@edux.com', 'Pass', 'Wrong email');
}

runTests();
