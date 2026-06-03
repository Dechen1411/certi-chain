const test = require("node:test");
const assert = require("node:assert/strict");
const { createHmac } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { getAddress } = require("ethers");
const request = require("supertest");

const { createApp } = require("../app");

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTomorrowDateInputValue = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateInputValue(tomorrow);
};

const TEST_JWT_SECRET = "test_jwt_secret";

const createExpectedAccountWallet = (email) => {
  const digest = createHmac("sha256", TEST_JWT_SECRET)
    .update(`certichain:student-wallet:${String(email).trim().toLowerCase()}`)
    .digest("hex");

  return getAddress(`0x${digest.slice(-40)}`);
};

const createFakeUserModel = (initialUsers = []) => {
  const users = [...initialUsers];

  const cloneUser = (user) => user && { ...user };

  const findOne = async (query) => {
    if (query.id) {
      return cloneUser(users.find((user) => user.id === query.id) || null);
    }

    if (query.walletAddressNormalized) {
      return cloneUser(
        users.find((user) => user.walletAddressNormalized === query.walletAddressNormalized) || null,
      );
    }

    if (Array.isArray(query.$or)) {
      return cloneUser(
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
        }) || null,
      );
    }

    return cloneUser(
      users.find((user) => {
        return Object.entries(query).every(([key, value]) => user[key] === value);
      }) || null,
    );
  };

  const create = async (data) => {
    users.push(data);
    return data;
  };

  const findOneAndUpdate = async (query, update) => {
    const user = users.find((candidate) => {
      return Object.entries(query).every(([key, value]) => candidate[key] === value);
    });

    if (!user) {
      return null;
    }

    Object.assign(user, update);
    return cloneUser(user);
  };

  return {
    findOne,
    findOneAndUpdate,
    create,
    _users: users,
  };
};

const cloneTemplate = (template) => ({ ...template });

const createFakeTemplateModel = (initialTemplates = []) => {
  const templates = initialTemplates.map(cloneTemplate);
  const findOneById = (id) => templates.find((template) => template.id === id) || null;

  const createQuery = (value) => ({
    sort(sortConfig) {
      if (Array.isArray(value) && sortConfig?.updatedAt === -1) {
        value.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      }
      return this;
    },
    lean: async () => Array.isArray(value) ? value.map(cloneTemplate) : value && cloneTemplate(value),
  });

  const create = async (data) => {
    const now = new Date();
    const template = {
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
    };
    templates.push(template);
    return template;
  };

  const find = () => createQuery([...templates]);
  const findOne = (query) => createQuery(findOneById(query.id));

  const findOneAndUpdate = (query, update) => {
    const template = findOneById(query.id);
    if (!template) {
      return createQuery(null);
    }

    if (update.$inc) {
      Object.entries(update.$inc).forEach(([key, amount]) => {
        template[key] = Number(template[key] || 0) + Number(amount || 0);
      });
    }

    if (update.$set) {
      Object.assign(template, update.$set);
    }

    const directUpdate = { ...update };
    delete directUpdate.$inc;
    delete directUpdate.$set;
    Object.assign(template, directUpdate, { updatedAt: new Date() });
    return createQuery(template);
  };

  const deleteOne = async (query) => {
    const index = templates.findIndex((template) => template.id === query.id);
    if (index === -1) {
      return { deletedCount: 0 };
    }

    templates.splice(index, 1);
    return { deletedCount: 1 };
  };

  return {
    create,
    deleteOne,
    find,
    findOne,
    findOneAndUpdate,
    _templates: templates,
  };
};

const cloneCertificate = (certificate) => ({ ...certificate });

const createFakeCertificateModel = (initialCertificates = []) => {
  const certificates = initialCertificates.map(cloneCertificate);

  const matchesQuery = (certificate, query) => {
    return Object.entries(query).every(([key, value]) => certificate[key] === value);
  };

  const createQuery = (value) => ({
    sort(sortConfig) {
      if (Array.isArray(value) && sortConfig?.issuedAt === -1) {
        value.sort((a, b) => {
          const aTime = new Date(a.issuedAt || a.createdAt || 0).getTime();
          const bTime = new Date(b.issuedAt || b.createdAt || 0).getTime();
          return bTime - aTime;
        });
      }
      return this;
    },
    lean: async () => Array.isArray(value) ? value.map(cloneCertificate) : value && cloneCertificate(value),
  });

  const create = async (data) => {
    const now = new Date();
    const certificate = {
      ...data,
      issuedAt: data.issuedAt || now,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
    };
    certificates.push(certificate);
    return certificate;
  };

  const find = (query = {}) => createQuery(certificates.filter((certificate) => matchesQuery(certificate, query)));
  const findOne = (query = {}) => createQuery(certificates.find((certificate) => matchesQuery(certificate, query)) || null);
  const findOneAndUpdate = (query = {}, update = {}) => {
    const certificate = certificates.find((candidate) => matchesQuery(candidate, query));
    if (!certificate) {
      return createQuery(null);
    }

    if (update.$set) {
      Object.assign(certificate, update.$set);
    }

    const directUpdate = { ...update };
    delete directUpdate.$set;
    Object.assign(certificate, directUpdate, { updatedAt: new Date() });
    return createQuery(certificate);
  };

  return {
    create,
    find,
    findOne,
    findOneAndUpdate,
    _certificates: certificates,
  };
};

const createTestApp = (overrides = {}) => {
  const userModel = overrides.userModel || createFakeUserModel();
  const templateModel = overrides.templateModel || createFakeTemplateModel();
  const certificateModel = overrides.certificateModel || createFakeCertificateModel();
  const issueCertificate = overrides.issueCertificate || (async () => ({ txHash: "0xtesthash" }));
  const revokeCertificate = overrides.revokeCertificate || (async () => ({ txHash: "0xrevoked" }));

  const app = createApp({
    Certificate: certificateModel,
    CertificateTemplate: templateModel,
    User: userModel,
    issueCertificate,
    revokeCertificate,
    frontendOrigin: "http://localhost:5173",
    jwtSecret: TEST_JWT_SECRET,
    jwtExpiresIn: "12h",
    allowedStudentDomain: "@rub.edu.bt",
    isProduction: false,
  });

  return { app, certificateModel, templateModel, userModel };
};

const createAdminModel = async () => {
  const adminHash = await bcrypt.hash("AdminPass123!", 12);
  return createFakeUserModel([
    {
      id: "admin-1",
      username: "admin",
      email: "admin@college.edu",
      passwordHash: adminHash,
      role: "admin",
      name: "Admin",
    },
  ]);
};

const loginAdmin = async (agent) => {
  const loginResponse = await agent.post("/api/auth/login").send({
    identifier: "admin",
    password: "AdminPass123!",
  });

  assert.equal(loginResponse.status, 200);
};

test("signup ignores requested admin role and creates student account", async () => {
  const { app, userModel } = createTestApp();

  const otpResponse = await request(app)
    .post("/api/auth/signup/request-otp")
    .send({
      email: "student@rub.edu.bt",
      password: "StrongPass123!",
      name: "Student User",
      role: "admin",
    });

  assert.equal(otpResponse.status, 202);
  assert.match(otpResponse.body.otpPreview, /^\d{6}$/);
  assert.equal(userModel._users.length, 0);

  const response = await request(app)
    .post("/api/auth/signup/verify")
    .send({
      email: "student@rub.edu.bt",
      otp: otpResponse.body.otpPreview,
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.role, "student");
  assert.equal(response.body.user.walletAddress, createExpectedAccountWallet("student@rub.edu.bt"));
  assert.ok(response.body.user.walletVerifiedAt);
  assert.equal(userModel._users.length, 1);
  assert.equal(userModel._users[0].role, "student");
  assert.equal(userModel._users[0].walletAddress, createExpectedAccountWallet("student@rub.edu.bt"));
  assert.equal(userModel._users[0].walletAddressNormalized, createExpectedAccountWallet("student@rub.edu.bt").toLowerCase());
});

test("signup rejects invalid email addresses", async () => {
  const { app, userModel } = createTestApp();

  const response = await request(app)
    .post("/api/auth/signup/request-otp")
    .send({
      email: "not-an-email",
      password: "StrongPass123!",
      name: "Student User",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Invalid email address");
  assert.equal(userModel._users.length, 0);
});

test("signup verification rejects invalid OTP without creating an account", async () => {
  const { app, userModel } = createTestApp();

  const otpResponse = await request(app)
    .post("/api/auth/signup/request-otp")
    .send({
      email: "student@rub.edu.bt",
      password: "StrongPass123!",
      name: "Student User",
    });

  assert.equal(otpResponse.status, 202);

  const response = await request(app)
    .post("/api/auth/signup/verify")
    .send({
      email: "student@rub.edu.bt",
      otp: "000000",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Invalid verification code");
  assert.equal(userModel._users.length, 0);
});

test("password reset updates password after OTP verification", async () => {
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
  const { app, userModel: model } = createTestApp({ userModel });

  const otpResponse = await request(app)
    .post("/api/auth/password-reset/request-otp")
    .send({ email: "student@rub.edu.bt" });

  assert.equal(otpResponse.status, 202);
  assert.match(otpResponse.body.otpPreview, /^\d{6}$/);

  const resetResponse = await request(app)
    .post("/api/auth/password-reset/verify")
    .send({
      email: "student@rub.edu.bt",
      otp: otpResponse.body.otpPreview,
      password: "NewStudentPass123!",
    });

  assert.equal(resetResponse.status, 200);
  assert.equal(resetResponse.body.message, "Password reset successful");
  assert.equal(await bcrypt.compare("NewStudentPass123!", model._users[0].passwordHash), true);

  const oldLoginResponse = await request(app)
    .post("/api/auth/login")
    .send({
      identifier: "student@rub.edu.bt",
      password: "StudentPass123!",
    });

  assert.equal(oldLoginResponse.status, 401);

  const newLoginResponse = await request(app)
    .post("/api/auth/login")
    .send({
      identifier: "student@rub.edu.bt",
      password: "NewStudentPass123!",
    });

  assert.equal(newLoginResponse.status, 200);
  assert.equal(newLoginResponse.body.user.email, "student@rub.edu.bt");
});

test("password reset rejects invalid OTP without changing password", async () => {
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
  const { app, userModel: model } = createTestApp({ userModel });

  const otpResponse = await request(app)
    .post("/api/auth/password-reset/request-otp")
    .send({ email: "student@rub.edu.bt" });

  assert.equal(otpResponse.status, 202);

  const resetResponse = await request(app)
    .post("/api/auth/password-reset/verify")
    .send({
      email: "student@rub.edu.bt",
      otp: "000000",
      password: "NewStudentPass123!",
    });

  assert.equal(resetResponse.status, 400);
  assert.equal(resetResponse.body.message, "Invalid verification code");
  assert.equal(await bcrypt.compare("StudentPass123!", model._users[0].passwordHash), true);
  assert.equal(await bcrypt.compare("NewStudentPass123!", model._users[0].passwordHash), false);
});

test("password reset request does not reveal missing accounts", async () => {
  const { app } = createTestApp();

  const response = await request(app)
    .post("/api/auth/password-reset/request-otp")
    .send({ email: "missing@rub.edu.bt" });

  assert.equal(response.status, 202);
  assert.equal(response.body.message, "If an account exists, a password reset code has been sent");
  assert.equal(response.body.otpPreview, undefined);
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

test("student login assigns an account-bound wallet", async () => {
  const studentHash = await bcrypt.hash("StudentPass123!", 12);
  const expectedWalletAddress = createExpectedAccountWallet("student@rub.edu.bt");
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

  const { app, userModel: model } = createTestApp({ userModel });
  const agent = request.agent(app);

  const loginResponse = await agent.post("/api/auth/login").send({
    identifier: "student",
    password: "StudentPass123!",
  });

  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.body.user.walletAddress, expectedWalletAddress);
  assert.ok(loginResponse.body.user.walletVerifiedAt);
  assert.equal(model._users[0].walletAddress, expectedWalletAddress);
  assert.equal(model._users[0].walletAddressNormalized, expectedWalletAddress.toLowerCase());

  const response = await agent
    .post("/api/student/wallet/bind")
    .send({ walletAddress: expectedWalletAddress.toLowerCase() });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.walletAddress, expectedWalletAddress);
});

test("wallet binding rejects invalid wallet addresses", async () => {
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

  const { app, userModel: model } = createTestApp({ userModel });
  const agent = request.agent(app);

  await agent.post("/api/auth/login").send({
    identifier: "student",
    password: "StudentPass123!",
  });

  const response = await agent
    .post("/api/student/wallet/bind")
    .send({ walletAddress: "not-a-wallet" });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Valid Ethereum wallet address is required");
  assert.equal(model._users[0].walletAddress, createExpectedAccountWallet("student@rub.edu.bt"));
});

test("wallet binding prevents students from replacing their assigned wallet", async () => {
  const studentHash = await bcrypt.hash("StudentPass123!", 12);
  const walletAddress = "0x8ba1f109551bD432803012645Ac136ddd64DBA72";
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

  await agent.post("/api/auth/login").send({
    identifier: "student",
    password: "StudentPass123!",
  });

  const response = await agent
    .post("/api/student/wallet/bind")
    .send({ walletAddress });

  assert.equal(response.status, 409);
  assert.equal(response.body.message, "Wallet address is locked to this student account");
});

test("admin session can issue certificates", async () => {
  const userModel = await createAdminModel();

  let issuedPayload = null;
  const issueCertificate = async (payload) => {
    issuedPayload = payload;
    return { txHash: "0xissued" };
  };

  const { app, certificateModel } = createTestApp({ userModel, issueCertificate });
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
  assert.equal(issueResponse.body.certificate.studentName, "Recipient");
  assert.equal(issueResponse.body.certificate.studentWalletAddress, "0x8ba1f109551bD432803012645Ac136ddd64DBA72");
  assert.equal(issuedPayload.studentName, "Recipient");
  assert.equal(issuedPayload.certificateType, "Bachelor of Science");
  assert.equal(certificateModel._certificates.length, 1);
  assert.equal(certificateModel._certificates[0].certificateId, issueResponse.body.certificateId);
  assert.equal(certificateModel._certificates[0].studentWalletAddressNormalized, "0x8ba1f109551bd432803012645ac136ddd64dba72");
});

test("admin can issue certificates using the student's saved wallet email", async () => {
  const walletAddress = "0x8ba1f109551bD432803012645Ac136ddd64DBA72";
  const userModel = await createAdminModel();
  userModel._users.push({
    id: "student-1",
    username: "recipient",
    email: "recipient@rub.edu.bt",
    passwordHash: "hashed-password",
    role: "student",
    name: "Recipient",
    walletAddress,
    walletAddressNormalized: walletAddress.toLowerCase(),
  });

  let issuedPayload = null;
  const issueCertificate = async (payload) => {
    issuedPayload = payload;
    return { txHash: "0xissued" };
  };

  const { app, certificateModel } = createTestApp({ userModel, issueCertificate });
  const agent = request.agent(app);

  await loginAdmin(agent);

  const issueResponse = await agent.post("/api/certificates/issue").send({
    studentName: "Recipient",
    studentEmail: "recipient@rub.edu.bt",
    certificateType: "Bachelor of Science",
    department: "Computer Science",
    issueDate: "2026-04-21",
  });

  assert.equal(issueResponse.status, 201);
  assert.equal(issueResponse.body.certificate.studentWalletAddress, walletAddress);
  assert.equal(issuedPayload.studentWalletAddress, walletAddress);
  assert.equal(certificateModel._certificates[0].studentWalletAddressNormalized, walletAddress.toLowerCase());
});

test("admin can issue certificates using a student's assigned account wallet", async () => {
  const userModel = await createAdminModel();
  const expectedWalletAddress = createExpectedAccountWallet("recipient@rub.edu.bt");
  userModel._users.push({
    id: "student-1",
    username: "recipient",
    email: "recipient@rub.edu.bt",
    passwordHash: "hashed-password",
    role: "student",
    name: "Recipient",
  });

  let issuedPayload = null;
  const issueCertificate = async (payload) => {
    issuedPayload = payload;
    return { txHash: "0xissued" };
  };

  const { app, certificateModel, userModel: model } = createTestApp({ userModel, issueCertificate });
  const agent = request.agent(app);

  await loginAdmin(agent);

  const issueResponse = await agent.post("/api/certificates/issue").send({
    studentName: "Recipient",
    studentEmail: "recipient@rub.edu.bt",
    certificateType: "Bachelor of Science",
    department: "Computer Science",
    issueDate: "2026-04-21",
  });

  assert.equal(issueResponse.status, 201);
  assert.equal(issueResponse.body.certificate.studentWalletAddress, expectedWalletAddress);
  assert.equal(issuedPayload.studentWalletAddress, expectedWalletAddress);
  assert.equal(model._users[1].walletAddress, expectedWalletAddress);
  assert.equal(certificateModel._certificates[0].studentWalletAddressNormalized, expectedWalletAddress.toLowerCase());
});

test("admin can issue a certificate from a saved template", async () => {
  const userModel = await createAdminModel();
  const templateModel = createFakeTemplateModel([
    {
      id: "template-1",
      name: "Excellence Award",
      category: "Achievement",
      description: "Awarded for academic excellence",
      title: "Certificate of Excellence",
      subtitle: "Presented to",
      body: "for outstanding academic achievement",
      footer: "Issued by the registrar",
      color: "from-green-400 to-green-600",
      uses: 0,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    },
  ]);

  let issuedPayload = null;
  const issueCertificate = async (payload) => {
    issuedPayload = payload;
    return { txHash: "0xissued" };
  };

  const { app, certificateModel } = createTestApp({ userModel, templateModel, issueCertificate });
  const agent = request.agent(app);

  await loginAdmin(agent);

  const issueResponse = await agent.post("/api/certificates/issue").send({
    studentName: "Recipient",
    studentEmail: "recipient@rub.edu.bt",
    studentWalletAddress: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    templateId: "template-1",
    issueDate: "2026-04-21",
  });

  assert.equal(issueResponse.status, 201);
  assert.equal(issuedPayload.certificateType, "Certificate of Excellence");
  assert.equal(issueResponse.body.certificate.certificateType, "Certificate of Excellence");
  assert.equal(issueResponse.body.certificate.template.id, "template-1");
  assert.equal(issueResponse.body.certificate.template.body, "for outstanding academic achievement");
  assert.equal(certificateModel._certificates[0].templateTitle, "Certificate of Excellence");
  assert.equal(certificateModel._certificates[0].templateColor, "from-green-400 to-green-600");
  assert.equal(templateModel._templates[0].uses, 1);
});

test("admin can list issued certificates from MongoDB", async () => {
  const userModel = await createAdminModel();
  const certificateModel = createFakeCertificateModel([
    {
      certificateId: "CERT-2026-000000001",
      txHash: "0xissued",
      certificateHash: "0xhash",
      tokenId: "1",
      studentName: "Recipient",
      studentEmail: "recipient@rub.edu.bt",
      studentWalletAddress: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
      studentWalletAddressNormalized: "0x8ba1f109551bd432803012645ac136ddd64dba72",
      certificateType: "Bachelor of Science",
      issueDate: "2026-04-21",
      issuedAt: new Date("2026-04-21T10:00:00Z"),
      revoked: false,
    },
  ]);

  const { app } = createTestApp({ userModel, certificateModel });
  const agent = request.agent(app);

  await loginAdmin(agent);

  const listResponse = await agent.get("/api/certificates");
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.certificates.length, 1);
  assert.equal(listResponse.body.certificates[0].certificateId, "CERT-2026-000000001");

  const statsResponse = await agent.get("/api/certificates/stats");
  assert.equal(statsResponse.status, 200);
  assert.equal(statsResponse.body.totalCertificates, 1);
  assert.equal(statsResponse.body.activeCertificates, 1);
});

test("admin can revoke an issued certificate", async () => {
  const userModel = await createAdminModel();
  const certificateModel = createFakeCertificateModel([
    {
      certificateId: "CERT-2026-000000001",
      txHash: "0xissued",
      certificateHash: "0xhash",
      tokenId: "1",
      studentName: "Recipient",
      studentEmail: "recipient@rub.edu.bt",
      studentWalletAddress: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
      studentWalletAddressNormalized: "0x8ba1f109551bd432803012645ac136ddd64dba72",
      certificateType: "Bachelor of Science",
      issueDate: "2026-04-21",
      issuedAt: new Date("2026-04-21T10:00:00Z"),
      revoked: false,
    },
  ]);
  let revokedPayload = null;
  const revokeCertificate = async (payload) => {
    revokedPayload = payload;
    return { txHash: "0xrevoked" };
  };

  const { app } = createTestApp({ userModel, certificateModel, revokeCertificate });
  const agent = request.agent(app);

  await loginAdmin(agent);

  const revokeResponse = await agent
    .post("/api/certificates/CERT-2026-000000001/revoke")
    .send({ reason: "Incorrect grade" });

  assert.equal(revokeResponse.status, 200);
  assert.equal(revokeResponse.body.txHash, "0xrevoked");
  assert.equal(revokeResponse.body.certificate.revoked, true);
  assert.equal(revokeResponse.body.certificate.revocationReason, "Incorrect grade");
  assert.equal(revokedPayload.tokenId, "1");
  assert.equal(revokedPayload.reason, "Incorrect grade");
  assert.equal(certificateModel._certificates[0].revoked, true);
  assert.equal(certificateModel._certificates[0].revokedBy, "admin-1");
  assert.equal(certificateModel._certificates[0].revokeTxHash, "0xrevoked");
});

test("revoke endpoint rejects an already revoked certificate", async () => {
  const userModel = await createAdminModel();
  const certificateModel = createFakeCertificateModel([
    {
      certificateId: "CERT-2026-000000001",
      txHash: "0xissued",
      certificateHash: "0xhash",
      tokenId: "1",
      studentName: "Recipient",
      studentEmail: "recipient@rub.edu.bt",
      studentWalletAddress: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
      studentWalletAddressNormalized: "0x8ba1f109551bd432803012645ac136ddd64dba72",
      certificateType: "Bachelor of Science",
      issueDate: "2026-04-21",
      issuedAt: new Date("2026-04-21T10:00:00Z"),
      revoked: true,
    },
  ]);
  let revokeCalls = 0;
  const revokeCertificate = async () => {
    revokeCalls += 1;
    return { txHash: "0xrevoked" };
  };

  const { app } = createTestApp({ userModel, certificateModel, revokeCertificate });
  const agent = request.agent(app);

  await loginAdmin(agent);

  const revokeResponse = await agent
    .post("/api/certificates/CERT-2026-000000001/revoke")
    .send({ reason: "Duplicate request" });

  assert.equal(revokeResponse.status, 409);
  assert.equal(revokeResponse.body.message, "Certificate is already revoked");
  assert.equal(revokeCalls, 0);
});

test("student can list certificates for their saved wallet", async () => {
  const studentHash = await bcrypt.hash("StudentPass123!", 12);
  const walletAddress = "0x8ba1f109551bD432803012645Ac136ddd64DBA72";
  const userModel = createFakeUserModel([
    {
      id: "student-1",
      username: "student",
      email: "student@rub.edu.bt",
      passwordHash: studentHash,
      role: "student",
      name: "Student",
      walletAddress,
      walletAddressNormalized: walletAddress.toLowerCase(),
    },
  ]);
  const certificateModel = createFakeCertificateModel([
    {
      certificateId: "CERT-2026-000000001",
      txHash: "0xissued",
      certificateHash: "0xhash",
      tokenId: "1",
      studentName: "Student",
      studentEmail: "student@rub.edu.bt",
      studentWalletAddress: walletAddress,
      studentWalletAddressNormalized: walletAddress.toLowerCase(),
      certificateType: "Bachelor of Science",
      issueDate: "2026-04-21",
      issuedAt: new Date("2026-04-21T10:00:00Z"),
      revoked: false,
    },
  ]);

  const { app } = createTestApp({ userModel, certificateModel });
  const agent = request.agent(app);

  await agent.post("/api/auth/login").send({
    identifier: "student",
    password: "StudentPass123!",
  });

  const response = await agent.get("/api/student/certificates");
  assert.equal(response.status, 200);
  assert.equal(response.body.certificates.length, 1);
  assert.equal(response.body.certificates[0].certificateId, "CERT-2026-000000001");
});

test("issue endpoint rejects invalid wallet address before issuing", async () => {
  const userModel = await createAdminModel();

  let issueCalls = 0;
  const issueCertificate = async () => {
    issueCalls += 1;
    return { txHash: "0xissued" };
  };

  const { app } = createTestApp({ userModel, issueCertificate });
  const agent = request.agent(app);

  await loginAdmin(agent);

  const issueResponse = await agent.post("/api/certificates/issue").send({
    studentName: "Recipient",
    studentEmail: "recipient@rub.edu.bt",
    studentWalletAddress: "not-a-wallet",
    certificateType: "Bachelor of Science",
  });

  assert.equal(issueResponse.status, 400);
  assert.equal(issueResponse.body.message, "Invalid student wallet address");
  assert.equal(issueCalls, 0);
});

test("issue endpoint rejects future issue dates before issuing", async () => {
  const userModel = await createAdminModel();

  let issueCalls = 0;
  const issueCertificate = async () => {
    issueCalls += 1;
    return { txHash: "0xissued" };
  };

  const { app } = createTestApp({ userModel, issueCertificate });
  const agent = request.agent(app);

  await loginAdmin(agent);

  const issueResponse = await agent.post("/api/certificates/issue").send({
    studentName: "Recipient",
    studentEmail: "recipient@rub.edu.bt",
    studentWalletAddress: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    certificateType: "Bachelor of Science",
    issueDate: getTomorrowDateInputValue(),
  });

  assert.equal(issueResponse.status, 400);
  assert.equal(issueResponse.body.message, "Issue date cannot be in the future");
  assert.equal(issueCalls, 0);
});

test("student session cannot access certificate templates", async () => {
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

  const response = await agent.get("/api/templates");
  assert.equal(response.status, 403);
});

test("admin can create, update, duplicate, and delete certificate templates", async () => {
  const userModel = await createAdminModel();
  const { app, templateModel } = createTestApp({ userModel });
  const agent = request.agent(app);

  await loginAdmin(agent);

  const createResponse = await agent.post("/api/templates").send({
    name: "Excellence Award",
    category: "Achievement",
    description: "Awarded for academic excellence",
    title: "Certificate of Excellence",
    subtitle: "This is to certify that",
    body: "has shown outstanding achievement",
    footer: "Issued by CertiChain",
    color: "from-blue-400 to-blue-600",
  });

  assert.equal(createResponse.status, 201);
  assert.ok(createResponse.body.template.id.startsWith("template-"));
  assert.equal(createResponse.body.template.name, "Excellence Award");
  assert.equal(templateModel._templates.length, 1);

  const templateId = createResponse.body.template.id;

  const listResponse = await agent.get("/api/templates");
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.templates.length, 1);
  assert.equal(listResponse.body.templates[0].id, templateId);

  const updateResponse = await agent.put(`/api/templates/${templateId}`).send({
    name: "Updated Award",
    category: "Academic",
    description: "Updated description",
    title: "Updated Title",
    subtitle: "Presented to",
    body: "for excellent work",
    footer: "Registrar",
    color: "from-green-400 to-green-600",
  });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.template.name, "Updated Award");
  assert.equal(updateResponse.body.template.title, "Updated Title");

  const duplicateResponse = await agent.post(`/api/templates/${templateId}/duplicate`);
  assert.equal(duplicateResponse.status, 201);
  assert.notEqual(duplicateResponse.body.template.id, templateId);
  assert.equal(duplicateResponse.body.template.name, "Updated Award Copy");
  assert.equal(templateModel._templates.length, 2);

  const deleteResponse = await agent.delete(`/api/templates/${templateId}`);
  assert.equal(deleteResponse.status, 204);
  assert.equal(templateModel._templates.length, 1);
});

test("admin session can bulk issue certificates", async () => {
  const userModel = await createAdminModel();
  const walletOne = "0x8ba1f109551bD432803012645Ac136ddd64DBA72";
  const walletTwo = "0x1111111111111111111111111111111111111111";
  userModel._users.push(
    {
      id: "student-1",
      username: "one",
      email: "one@rub.edu.bt",
      passwordHash: "hashed-password",
      role: "student",
      name: "Recipient One",
      walletAddress: walletOne,
      walletAddressNormalized: walletOne.toLowerCase(),
    },
    {
      id: "student-2",
      username: "two",
      email: "two@rub.edu.bt",
      passwordHash: "hashed-password",
      role: "student",
      name: "Recipient Two",
      walletAddress: walletTwo,
      walletAddressNormalized: walletTwo.toLowerCase(),
    },
  );

  const issuedPayloads = [];
  const issueCertificate = async (payload) => {
    issuedPayloads.push(payload);
    return { txHash: `0xissued${issuedPayloads.length}` };
  };

  const { app, certificateModel } = createTestApp({ userModel, issueCertificate });
  const agent = request.agent(app);

  await loginAdmin(agent);

  const issueResponse = await agent.post("/api/certificates/bulk-issue").send({
    certificateType: "Bachelor of Science",
    department: "Computer Science",
    issueDate: "2026-04-21",
    students: [
      {
        name: "Recipient One",
        email: "one@rub.edu.bt",
        studentId: "STU-1",
        grade: "A",
      },
      {
        name: "Recipient Two",
        email: "two@rub.edu.bt",
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
  assert.equal(issuedPayloads[0].studentWalletAddress, walletOne);
  assert.equal(issuedPayloads[1].studentWalletAddress, walletTwo);
  assert.equal(issuedPayloads[0].certificateType, "Bachelor of Science");
  assert.equal(certificateModel._certificates.length, 2);
  assert.equal(issueResponse.body.issued[0].certificate.studentName, "Recipient One");
});
