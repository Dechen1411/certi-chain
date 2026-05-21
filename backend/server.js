require("dotenv").config({ override: true });

const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { createApp } = require("./app");
const { issueCertificateOnChain } = require("./blockchainIssuer");
const { Certificate, CertificateTemplate, User, connectDb } = require("./db");
const { createSignupOtpSender } = require("./emailOtp");
const { createPrivyAccessTokenVerifier } = require("./privy");

const PORT = Number(process.env.PORT || 4000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || process.env.RENDER_EXTERNAL_URL || "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";
const ALLOWED_STUDENT_DOMAIN = process.env.ALLOWED_STUDENT_DOMAIN || "@rub.edu.bt";
const MONGODB_URI = process.env.MONGODB_URI || "";
const CHAIN_RPC_URL = process.env.CHAIN_RPC_URL || "";
const CERTIFICATE_REGISTRY_ADDRESS = process.env.CERTIFICATE_REGISTRY_ADDRESS || "";
const ISSUER_PRIVATE_KEY = process.env.ISSUER_PRIVATE_KEY || "";
const PRIVY_APP_ID = process.env.PRIVY_APP_ID || process.env.VITE_PRIVY_APP_ID || "";
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET || "";
const PRIVY_API_URL = process.env.PRIVY_API_URL || "";
const PRIVY_JWT_VERIFICATION_KEY = process.env.PRIVY_JWT_VERIFICATION_KEY || "";
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = process.env.SMTP_PORT || "587";
const SMTP_SECURE = process.env.SMTP_SECURE === "true";
const SMTP_FAMILY = process.env.SMTP_FAMILY || "";
const SMTP_CONNECTION_TIMEOUT_MS = process.env.SMTP_CONNECTION_TIMEOUT_MS || "";
const SMTP_GREETING_TIMEOUT_MS = process.env.SMTP_GREETING_TIMEOUT_MS || "";
const SMTP_SOCKET_TIMEOUT_MS = process.env.SMTP_SOCKET_TIMEOUT_MS || "";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || "";
const STATIC_ROOT = process.env.STATIC_ROOT || path.resolve(__dirname, "..", "frontend", "dist");
const staticRoot = process.env.NODE_ENV === "production" && fs.existsSync(path.join(STATIC_ROOT, "index.html"))
  ? STATIC_ROOT
  : "";

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in backend environment");
}

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in backend environment");
}

const seedAdminUserIfConfigured = async () => {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminUsername = process.env.ADMIN_USERNAME?.trim().toLowerCase() || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();

  if (!adminEmail || !adminPassword) {
    return;
  }

  const existing = await User.findOne({
    $or: [{ email: adminEmail }, { username: adminUsername }],
  }).lean();
  if (existing) {
    return;
  }

  const passwordHash = bcrypt.hashSync(adminPassword, 12);
  await User.create({
    id: `admin-${Date.now()}`,
    username: adminUsername,
    email: adminEmail,
    passwordHash,
    role: "admin",
    name: "Administrator",
  });
};

const app = createApp({
  Certificate,
  CertificateTemplate,
  User,
  issueCertificate: (certificate) => issueCertificateOnChain(certificate, {
    chainRpcUrl: CHAIN_RPC_URL,
    certificateRegistryAddress: CERTIFICATE_REGISTRY_ADDRESS,
    issuerPrivateKey: ISSUER_PRIVATE_KEY,
  }),
  frontendOrigin: FRONTEND_ORIGIN,
  jwtSecret: JWT_SECRET,
  jwtExpiresIn: JWT_EXPIRES_IN,
  allowedStudentDomain: ALLOWED_STUDENT_DOMAIN,
  isProduction: process.env.NODE_ENV === "production",
  staticRoot,
  verifyPrivyAccessToken: createPrivyAccessTokenVerifier({
    appId: PRIVY_APP_ID,
    appSecret: PRIVY_APP_SECRET,
    apiUrl: PRIVY_API_URL,
    jwtVerificationKey: PRIVY_JWT_VERIFICATION_KEY,
  }),
  sendSignupOtp: createSignupOtpSender({
    appName: "CertiChain",
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    family: SMTP_FAMILY,
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
    user: SMTP_USER,
    pass: SMTP_PASS,
    from: SMTP_FROM,
    allowPreview: process.env.NODE_ENV !== "production",
  }),
});

const startServer = async () => {
  await connectDb(MONGODB_URI);
  await seedAdminUserIfConfigured();

  app.listen(PORT);
};

startServer().catch((error) => {
  console.error("Failed to start auth API:", error);
  process.exit(1);
});

module.exports = { app };
