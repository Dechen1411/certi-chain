const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const request = require("supertest");

const { createApp } = require("../app");

const createFakeUserModel = (initialUsers = []) => {
  const users = [...initialUsers];

  const findOne = async (query) => {
    if (query.id) {
      return users.find((user) => user.id === query.id) || null;
    }

    if (Array.isArray(query.$or)) {
      return (
        users.find((user) => {
          return query.$or.some((condition) => {
            if (condition.email) {
              return user.email === condition.email;
            }
            if (condition.username) {
              return user.username === condition.username;
            }
            return false;
          });
        }) || null
      );
    }

    return null;
  };

  const create = async (data) => {
    users.push(data);
    return data;
  };

  return {
    findOne,
    create,
    _users: users,
  };
};

const createTestApp = (overrides = {}) => {
  const userModel = overrides.userModel || createFakeUserModel();
  const issueCertificate = overrides.issueCertificate || (async () => ({ txHash: "0xtesthash" }));

  const app = createApp({
    User: userModel,
    issueCertificate,
    frontendOrigin: "http://localhost:5173",
    jwtSecret: "test_jwt_secret",
    jwtExpiresIn: "12h",
    allowedStudentDomain: "@rub.edu.bt",
    isProduction: false,
  });

  return { app, userModel };
};

test("signup ignores requested admin role and creates student account", async () => {
  const { app, userModel } = createTestApp();

  const response = await request(app)
    .post("/api/auth/signup")
    .send({
      email: "student@rub.edu.bt",
      password: "StrongPass123!",
      name: "Student User",
      role: "admin",
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.role, "student");
  assert.equal(userModel._users.length, 1);
  assert.equal(userModel._users[0].role, "student");
});

test("issue endpoint requires authentication", async () => {
  const { app } = createTestApp();

  const response = await request(app)
    .post("/api/certificates/issue")
    .send({
      studentName: "Test Student",
      studentEmail: "student@rub.edu.bt",
      studentWalletAddress: "0x123",
      certificateType: "BSc",
    });

  assert.equal(response.status, 401);
});

test("student session cannot issue certificates", async () => {
  const studentHash = await bcrypt.hash("StudentPass123!", 12);
  const userModel = createFakeUserModel([
    {
      id: "student-1",
      username: "student",
      email: "student@rub.edu.bt",
      passwordHash: studentHash,
      role: "student",
      name: "Student",
    },
  ]);

  const { app } = createTestApp({ userModel });
  const agent = request.agent(app);

  const loginResponse = await agent.post("/api/auth/login").send({
    identifier: "student",
    password: "StudentPass123!",
  });

  assert.equal(loginResponse.status, 200);

  const issueResponse = await agent.post("/api/certificates/issue").send({
    studentName: "Another Student",
    studentEmail: "another@rub.edu.bt",
    studentWalletAddress: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    certificateType: "BSc",
  });

  assert.equal(issueResponse.status, 403);
});

test("admin session can issue certificates", async () => {
  const adminHash = await bcrypt.hash("AdminPass123!", 12);
  const userModel = createFakeUserModel([
    {
      id: "admin-1",
      username: "admin",
      email: "admin@college.edu",
      passwordHash: adminHash,
      role: "admin",
      name: "Admin",
    },
  ]);

  let issuedPayload = null;
  const issueCertificate = async (payload) => {
    issuedPayload = payload;
    return { txHash: "0xissued" };
  };

  const { app } = createTestApp({ userModel, issueCertificate });
  const agent = request.agent(app);

  const loginResponse = await agent.post("/api/auth/login").send({
    identifier: "admin",
    password: "AdminPass123!",
  });

  assert.equal(loginResponse.status, 200);

  const issueResponse = await agent.post("/api/certificates/issue").send({
    studentName: "Recipient",
    studentEmail: "recipient@rub.edu.bt",
    studentWalletAddress: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    certificateType: "Bachelor of Science",
    department: "Computer Science",
    grade: "Distinction",
    issueDate: "2026-04-21",
  });

  assert.equal(issueResponse.status, 201);
  assert.ok(issueResponse.body.certificateId.startsWith("CERT-"));
  assert.equal(issueResponse.body.txHash, "0xissued");
  assert.equal(issuedPayload.studentName, "Recipient");
  assert.equal(issuedPayload.certificateType, "Bachelor of Science");
});

test("admin session can bulk issue certificates", async () => {
  const adminHash = await bcrypt.hash("AdminPass123!", 12);
  const userModel = createFakeUserModel([
    {
      id: "admin-1",
      username: "admin",
      email: "admin@college.edu",
      passwordHash: adminHash,
      role: "admin",
      name: "Admin",
    },
  ]);

  const issuedPayloads = [];
  const issueCertificate = async (payload) => {
    issuedPayloads.push(payload);
    return { txHash: `0xissued${issuedPayloads.length}` };
  };

  const { app } = createTestApp({ userModel, issueCertificate });
  const agent = request.agent(app);

  const loginResponse = await agent.post("/api/auth/login").send({
    identifier: "admin",
    password: "AdminPass123!",
  });

  assert.equal(loginResponse.status, 200);

  const issueResponse = await agent.post("/api/certificates/bulk-issue").send({
    certificateType: "Bachelor of Science",
    department: "Computer Science",
    issueDate: "2026-04-21",
    students: [
      {
        name: "Recipient One",
        email: "one@rub.edu.bt",
        walletAddress: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
        studentId: "STU-1",
        grade: "A",
      },
      {
        name: "Recipient Two",
        email: "two@rub.edu.bt",
        walletAddress: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
        studentId: "STU-2",
        grade: "B",
      },
    ],
  });

  assert.equal(issueResponse.status, 201);
  assert.equal(issueResponse.body.succeeded, 2);
  assert.equal(issueResponse.body.failedCount, 0);
  assert.equal(issuedPayloads.length, 2);
  assert.equal(issuedPayloads[0].studentName, "Recipient One");
  assert.equal(issuedPayloads[1].studentEmail, "two@rub.edu.bt");
  assert.equal(issuedPayloads[0].certificateType, "Bachelor of Science");
});
