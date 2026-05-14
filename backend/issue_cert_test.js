const request = require('supertest');
const { createApp } = require('./app');
const { connectDb, User } = require('./db');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function run() {
  try {
    console.log('Connecting to database...');
    await connectDb(process.env.MONGODB_URI);
    
    console.log('Initializing app...');
    const app = createApp({
      User,
      issueCertificate: async (cert) => {
        console.log('Mocked blockchain issuance for certificate:', cert.certificateId);
        return { txHash: '0xmocked_transaction_hash_' + Date.now() };
      },
      frontendOrigin: process.env.FRONTEND_ORIGIN,
      jwtSecret: process.env.JWT_SECRET,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN,
      allowedStudentDomain: process.env.ALLOWED_STUDENT_DOMAIN,
      isProduction: false,
    });

    console.log('Logging in as admin...');
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD
      });

    console.log('Login Status:', loginRes.status);
    if (loginRes.status !== 200) {
      console.error('Login failed:', loginRes.body);
      process.exit(1);
    }

    const cookies = loginRes.headers['set-cookie'];

    console.log('Issuing certificate...');
    const issuePayload = {
      studentName: 'John Doe',
      studentEmail: 'john.doe@rub.edu.bt',
      studentWalletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      certificateType: 'Bachelor of Science',
      department: 'Computer Science',
      grade: 'Distinction',
      issueDate: new Date().toISOString(),
      completionDate: new Date().toISOString(),
      additionalNotes: 'Passed with high honors',
      studentId: 'STUD001'
    };

    const issueRes = await request(app)
      .post('/api/certificates/issue')
      .set('Cookie', cookies)
      .send(issuePayload);

    console.log('Issue Status:', issueRes.status);
    console.log('Issue Response Body:', JSON.stringify(issueRes.body, null, 2));

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
