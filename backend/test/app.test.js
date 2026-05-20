const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const request = require("supertest");

const { createApp } = require("../app");
const { getLinkedEthereumWalletAddresses } = require("../privy");

test("Privy wallet extraction accepts linked Ethereum and smart wallets", () => {
  const addresses = getLinkedEthereumWalletAddresses({
    linked_accounts: [
      {
        type: "wallet",
        chain_type: "ethereum",
        address: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
      },
      {
        type: "smart_wallet",
        address: "0x1111111111111111111111111111111111111111",
      },
      {
        type: "wallet",
        chain_type: "solana",
        address: "11111111111111111111111111111111",
      },
    ],
  });

  assert.deepEqual(addresses, [
    "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    "0x1111111111111111111111111111111111111111",
  ]);
});

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

    return null;
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

    Object.assign(template, update, { updatedAt: new Date() });
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

  return {
    create,
    find,
    _certificates: certificates,
  };
};

const createTestApp = (overrides = {}) => {
  const userModel = overrides.userModel || createFakeUserModel();
  const templateModel = overrides.templateModel || createFakeTemplateModel();
  const certificateModel = overrides.certificateModel || createFakeCertificateModel();
  const issueCertificate = overrides.issueCertificate || (async () => ({ txHash: "0xtesthash" }));

  const app = createApp({
    Certificate: certificateModel,
    CertificateTemplate: templateModel,
    User: userModel,
    issueCertificate,
    frontendOrigin: "http://localhost:5173",
    jwtSecret: "test_jwt_secret",
    jwtExpiresIn: "12h",
    allowedStudentDomain: "@rub.edu.bt",
    isProduction: false,
    verifyPrivyAccessToken: overrides.verifyPrivyAccessToken,
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

test("student can bind a Privy-verified wallet", async () => {
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

  const verifyPrivyAccessToken = async (token) => {
    assert.equal(token, "privy-token");
    return {
      privyUserId: "did:privy:student-1",
      walletAddresses: [walletAddress.toLowerCase()],
    };
  };

  const { app, userModel: model } = createTestApp({ userModel, verifyPrivyAccessToken });
  const agent = request.agent(app);

  const loginResponse = await agent.post("/api/auth/login").send({
    identifier: "student",
    password: "StudentPass123!",
  });

  assert.equal(loginResponse.status, 200);

  const response = await agent
    .post("/api/student/wallet/bind")
    .set("Authorization", "Bearer privy-token")
    .send({ walletAddress: walletAddress.toLowerCase() });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.walletAddress, walletAddress);
  assert.ok(response.body.user.walletVerifiedAt);
  assert.equal(model._users[0].walletAddress, walletAddress);
  assert.equal(model._users[0].walletAddressNormalized, walletAddress.toLowerCase());
  assert.equal(model._users[0].privyUserId, "did:privy:student-1");
});

test("wallet binding rejects wallets not linked to the Privy session", async () => {
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

  const { app, userModel: model } = createTestApp({
    userModel,
    verifyPrivyAccessToken: async () => ({
      privyUserId: "did:privy:student-1",
      walletAddresses: ["0x8ba1f109551bD432803012645Ac136ddd64DBA72"],
    }),
  });
  const agent = request.agent(app);

  await agent.post("/api/auth/login").send({
    identifier: "student",
    password: "StudentPass123!",
  });

  const response = await agent
    .post("/api/student/wallet/bind")
    .set("Authorization", "Bearer privy-token")
    .send({ walletAddress: "0x1111111111111111111111111111111111111111" });

  assert.equal(response.status, 403);
  assert.match(response.body.message, /not linked to the signed-in Privy user/);
  assert.equal(model._users[0].walletAddress, undefined);
});

test("wallet binding prevents one wallet from being linked to two students", async () => {
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
    {
      id: "student-2",
      username: "linked",
      email: "linked@rub.edu.bt",
      passwordHash: studentHash,
      role: "student",
      name: "Linked Student",
      walletAddress,
      walletAddressNormalized: walletAddress.toLowerCase(),
      privyUserId: "did:privy:student-2",
      walletVerifiedAt: new Date(),
    },
  ]);

  const { app } = createTestApp({
    userModel,
    verifyPrivyAccessToken: async () => ({
      privyUserId: "did:privy:student-1",
      walletAddresses: [walletAddress],
    }),
  });
  const agent = request.agent(app);

  await agent.post("/api/auth/login").send({
    identifier: "student",
    password: "StudentPass123!",
  });

  const response = await agent
    .post("/api/student/wallet/bind")
    .set("Authorization", "Bearer privy-token")
    .send({ walletAddress });

  assert.equal(response.status, 409);
  assert.equal(response.body.message, "Wallet is already linked to another student");
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

test("student can list certificates for their verified wallet", async () => {
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
  assert.equal(certificateModel._certificates.length, 2);
  assert.equal(issueResponse.body.issued[0].certificate.studentName, "Recipient One");
});
