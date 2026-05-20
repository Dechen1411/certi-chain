const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { randomInt, randomUUID } = require("crypto");
const express = require("express");
const { getAddress, isAddress } = require("ethers");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const path = require("path");
const rateLimit = require("express-rate-limit");

const AUTH_COOKIE_NAME = "certifypro_session";

const executeMaybeLean = async (queryResult) => {
  if (!queryResult) {
    return null;
  }

  if (typeof queryResult.lean === "function") {
    return queryResult.lean();
  }

  return queryResult;
};

const createCertificateId = () => {
  return `CERT-${new Date().getFullYear()}-${randomInt(0, 1_000_000_000).toString().padStart(9, "0")}`;
};

const createTemplateId = () => {
  return `template-${randomUUID()}`;
};

const parseOriginList = (value) => {
  return String(value || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
};

const getAllowedOrigins = (frontendOrigin) => {
  return Array.from(new Set([
    ...parseOriginList(frontendOrigin),
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]));
};

const normalizeCertificateInput = (body) => ({
  studentName: String(body?.studentName || body?.name || "").trim(),
  studentEmail: String(body?.studentEmail || body?.email || "").trim().toLowerCase(),
  studentWalletAddress: String(body?.studentWalletAddress || body?.walletAddress || "").trim(),
  certificateType: String(body?.certificateType || "").trim(),
  department: String(body?.department || "").trim(),
  grade: String(body?.grade || "").trim(),
  issueDate: String(body?.issueDate || "").trim() || new Date().toISOString().split("T")[0],
  completionDate: String(body?.completionDate || "").trim(),
  additionalNotes: String(body?.additionalNotes || body?.notes || "").trim(),
  studentId: String(body?.studentId || "").trim(),
});

const normalizeTemplateInput = (body) => ({
  name: String(body?.name || "").trim(),
  category: String(body?.category || "").trim(),
  description: String(body?.description || "").trim(),
  title: String(body?.title || "").trim(),
  subtitle: String(body?.subtitle || "").trim(),
  body: String(body?.body || "").trim(),
  footer: String(body?.footer || "").trim(),
  color: String(body?.color || "").trim() || "from-slate-700 to-slate-900",
  uses: Number.isFinite(Number(body?.uses)) ? Math.max(0, Number(body.uses)) : undefined,
});

const getTemplateInputError = (template) => {
  if (!template.name || !template.title) {
    return "Template name and title are required";
  }

  if (template.name.length > 120) {
    return "Template name must be 120 characters or less";
  }

  if (template.title.length > 160) {
    return "Template title must be 160 characters or less";
  }

  return "";
};

const toTemplateWriteData = (template) => {
  const data = {
    name: template.name,
    category: template.category,
    description: template.description,
    title: template.title,
    subtitle: template.subtitle,
    body: template.body,
    footer: template.footer,
    color: template.color,
  };

  if (template.uses !== undefined) {
    data.uses = template.uses;
  }

  return data;
};

const getCertificateInputError = (certificate) => {
  if (
    !certificate.studentName ||
    !certificate.studentEmail ||
    !certificate.studentWalletAddress ||
    !certificate.certificateType
  ) {
    return "Missing required certificate fields";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(certificate.studentEmail)) {
    return "Invalid student email";
  }

  if (!isAddress(certificate.studentWalletAddress)) {
    return "Invalid student wallet address";
  }

  return "";
};

const createHelmetOptions = () => ({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: [
        "'self'",
        "https:",
        "wss:",
        "http://localhost:4000",
        "http://127.0.0.1:4000",
        "http://localhost:8545",
        "http://127.0.0.1:8545",
      ],
      fontSrc: ["'self'", "data:"],
      formAction: ["'self'"],
      frameSrc: ["'self'", "https://auth.privy.io", "https://*.privy.io"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

const toIssuePayload = (certificateId, certificate) => ({
  certificateId,
  studentName: certificate.studentName,
  studentEmail: certificate.studentEmail,
  studentWalletAddress: certificate.studentWalletAddress,
  studentId: certificate.studentId,
  department: certificate.department,
  certificateType: certificate.certificateType,
  grade: certificate.grade,
  issueDate: certificate.issueDate,
  completionDate: certificate.completionDate,
  notes: certificate.additionalNotes,
});

const toIsoString = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toPublicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  name: user.name,
  walletAddress: user.walletAddress || "",
  walletVerifiedAt: toIsoString(user.walletVerifiedAt),
});

const toPublicTemplate = (template) => ({
  id: template.id,
  name: template.name,
  category: template.category || "",
  description: template.description || "",
  title: template.title,
  subtitle: template.subtitle || "",
  body: template.body || "",
  footer: template.footer || "",
  color: template.color || "from-slate-700 to-slate-900",
  uses: Number(template.uses || 0),
  createdAt: template.createdAt instanceof Date ? template.createdAt.toISOString() : String(template.createdAt || ""),
  updatedAt: template.updatedAt instanceof Date ? template.updatedAt.toISOString() : String(template.updatedAt || ""),
});

const createAuthCookieOptions = (isProduction, expiresInMs) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
  maxAge: expiresInMs,
});

const parseExpiresInMs = (expiresIn) => {
  if (typeof expiresIn === "number") {
    return expiresIn * 1000;
  }

  if (!expiresIn || typeof expiresIn !== "string") {
    return 12 * 60 * 60 * 1000;
  }

  const match = expiresIn.trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    return 12 * 60 * 60 * 1000;
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = unit === "s"
    ? 1000
    : unit === "m"
    ? 60 * 1000
    : unit === "h"
    ? 60 * 60 * 1000
    : 24 * 60 * 60 * 1000;

  return value * multiplier;
};

const getBearerToken = (req) => {
  const authorizationHeader = String(req.get("authorization") || "");
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
};

const normalizeWalletAddress = (address) => {
  const candidate = String(address || "").trim();
  return isAddress(candidate) ? getAddress(candidate) : "";
};

const createApp = ({
  CertificateTemplate,
  User,
  issueCertificate,
  frontendOrigin,
  jwtSecret,
  jwtExpiresIn,
  allowedStudentDomain,
  isProduction,
  staticRoot,
  verifyPrivyAccessToken,
}) => {
  if (!jwtSecret) {
    throw new Error("Missing JWT_SECRET in backend environment");
  }

  const authCookieMaxAge = parseExpiresInMs(jwtExpiresIn);
  const authCookieOptions = createAuthCookieOptions(isProduction, authCookieMaxAge);
  const allowedOrigins = getAllowedOrigins(frontendOrigin);

  const corsOptions = {
    origin(origin, callback) {
      // Allow server-to-server requests and same-origin requests without Origin header.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  };

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", isProduction ? 1 : false);

  app.use(helmet(createHelmetOptions()));
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

  const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const issueToken = (user) => {
    return jwt.sign(
      {
        sub: user.id,
        role: user.role,
        email: user.email,
        username: user.username,
        name: user.name,
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn },
    );
  };

  const authenticate = (req, res, next) => {
    const token = req.cookies?.[AUTH_COOKIE_NAME] || "";

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const payload = jwt.verify(token, jwtSecret);
      req.auth = payload;
      return next();
    } catch {
      return res.status(401).json({ message: "Invalid or expired session" });
    }
  };

  const requireRole = (role) => (req, res, next) => {
    if (req.auth?.role !== role) {
      const label = role === "admin" ? "Admin" : "Student";
      return res.status(403).json({ message: `${label} account required` });
    }

    return next();
  };

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    const identifier = String(req.body?.identifier || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!identifier || !password) {
      return res.status(400).json({ message: "Identifier and password are required" });
    }

    const user = await executeMaybeLean(
      User.findOne({
        $or: [{ email: identifier }, { username: identifier }],
      }),
    );
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const publicUser = toPublicUser(user);
    const token = issueToken(publicUser);
    res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
    return res.json({ user: publicUser });
  });

  app.post("/api/auth/signup", authLimiter, async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const name = String(req.body?.name || "").trim();
    const username = String(req.body?.username || email).trim().toLowerCase();
    const role = "student";

    if (!email || !password || !name) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    if (!email.endsWith(allowedStudentDomain)) {
      return res.status(400).json({ message: `Student account requires ${allowedStudentDomain} email` });
    }

    const existing = await executeMaybeLean(
      User.findOne({
        $or: [{ email }, { username }],
      }),
    );
    if (existing) {
      return res.status(409).json({ message: "Email or username already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = `${role}-${Date.now()}`;

    await User.create({
      id,
      username,
      email,
      passwordHash,
      role,
      name,
    });

    const user = { id, username, email, role, name };
    const token = issueToken(user);
    res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
    return res.status(201).json({ user });
  });

  app.post("/api/auth/logout", (_req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions);
    return res.status(204).send();
  });

  app.get("/api/auth/me", async (req, res) => {
    const token = req.cookies?.[AUTH_COOKIE_NAME] || "";
    if (!token) {
      return res.json({ user: null });
    }

    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch {
      return res.status(401).json({ message: "Invalid or expired session" });
    }

    const userQuery = User.findOne({ id: payload.sub });
    if (typeof userQuery?.select === "function") {
      userQuery.select("id username email role name walletAddress walletVerifiedAt");
    }

    const user = await executeMaybeLean(userQuery);
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    return res.json({ user: toPublicUser(user) });
  });

  app.post("/api/student/wallet/bind", authenticate, requireRole("student"), async (req, res) => {
    const walletAddress = normalizeWalletAddress(req.body?.walletAddress);
    if (!walletAddress) {
      return res.status(400).json({ message: "Valid Ethereum wallet address is required" });
    }

    const privyAccessToken = getBearerToken(req);
    if (!privyAccessToken) {
      return res.status(401).json({ message: "Privy access token is required" });
    }

    if (typeof verifyPrivyAccessToken !== "function") {
      return res.status(503).json({
        message: "Privy server verification is not configured",
      });
    }

    let verifiedPrivyUser;
    try {
      verifiedPrivyUser = await verifyPrivyAccessToken(privyAccessToken);
    } catch {
      return res.status(401).json({ message: "Privy session could not be verified" });
    }

    const walletAddressNormalized = walletAddress.toLowerCase();
    const verifiedWalletAddresses = Array.isArray(verifiedPrivyUser?.walletAddresses)
      ? verifiedPrivyUser.walletAddresses
          .map(normalizeWalletAddress)
          .filter(Boolean)
          .map((address) => address.toLowerCase())
      : [];

    if (!verifiedWalletAddresses.includes(walletAddressNormalized)) {
      return res.status(403).json({
        message: "This wallet is not linked to the signed-in Privy user. Sign out of Privy, reconnect the correct wallet, then verify again.",
      });
    }

    const existingWalletUser = await executeMaybeLean(
      User.findOne({ walletAddressNormalized }),
    );
    if (existingWalletUser && existingWalletUser.id !== req.auth.sub) {
      return res.status(409).json({ message: "Wallet is already linked to another student" });
    }

    try {
      const updatedUserQuery = User.findOneAndUpdate(
        { id: req.auth.sub, role: "student" },
        {
          walletAddress,
          walletAddressNormalized,
          privyUserId: verifiedPrivyUser.privyUserId || "",
          walletVerifiedAt: new Date(),
        },
        { new: true, runValidators: true },
      );

      if (typeof updatedUserQuery?.select === "function") {
        updatedUserQuery.select("id username email role name walletAddress walletVerifiedAt");
      }

      const updatedUser = await executeMaybeLean(updatedUserQuery);
      if (!updatedUser) {
        return res.status(404).json({ message: "Student account not found" });
      }

      return res.json({ user: toPublicUser(updatedUser) });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ message: "Wallet is already linked to another student" });
      }

      return res.status(500).json({ message: "Unable to save verified wallet" });
    }
  });

  app.get("/api/templates", authenticate, requireRole("admin"), async (_req, res) => {
    const query = CertificateTemplate.find({});
    if (typeof query?.sort === "function") {
      query.sort({ updatedAt: -1, createdAt: -1 });
    }

    const templates = await executeMaybeLean(query);
    return res.json({ templates: (templates || []).map(toPublicTemplate) });
  });

  app.get("/api/templates/:id", authenticate, requireRole("admin"), async (req, res) => {
    const template = await executeMaybeLean(CertificateTemplate.findOne({ id: req.params.id }));
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    return res.json({ template: toPublicTemplate(template) });
  });

  app.post("/api/templates", authenticate, requireRole("admin"), async (req, res) => {
    const input = normalizeTemplateInput(req.body);
    const validationError = getTemplateInputError(input);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const template = await CertificateTemplate.create({
      id: createTemplateId(),
      ...toTemplateWriteData(input),
      uses: input.uses ?? 0,
      createdBy: req.auth.sub,
      updatedBy: req.auth.sub,
    });

    return res.status(201).json({ template: toPublicTemplate(template) });
  });

  app.put("/api/templates/:id", authenticate, requireRole("admin"), async (req, res) => {
    const input = normalizeTemplateInput(req.body);
    const validationError = getTemplateInputError(input);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const updated = await executeMaybeLean(
      CertificateTemplate.findOneAndUpdate(
        { id: req.params.id },
        {
          ...toTemplateWriteData(input),
          updatedBy: req.auth.sub,
        },
        { new: true },
      ),
    );
    if (!updated) {
      return res.status(404).json({ message: "Template not found" });
    }

    return res.json({ template: toPublicTemplate(updated) });
  });

  app.post("/api/templates/:id/duplicate", authenticate, requireRole("admin"), async (req, res) => {
    const existing = await executeMaybeLean(CertificateTemplate.findOne({ id: req.params.id }));
    if (!existing) {
      return res.status(404).json({ message: "Template not found" });
    }

    const duplicate = await CertificateTemplate.create({
      name: `${existing.name} Copy`,
      category: existing.category || "",
      description: existing.description || "",
      title: existing.title,
      subtitle: existing.subtitle || "",
      body: existing.body || "",
      footer: existing.footer || "",
      color: existing.color || "from-slate-700 to-slate-900",
      uses: 0,
      id: createTemplateId(),
      createdBy: req.auth.sub,
      updatedBy: req.auth.sub,
    });

    return res.status(201).json({ template: toPublicTemplate(duplicate) });
  });

  app.delete("/api/templates/:id", authenticate, requireRole("admin"), async (req, res) => {
    const result = await CertificateTemplate.deleteOne({ id: req.params.id });
    if (!result?.deletedCount) {
      return res.status(404).json({ message: "Template not found" });
    }

    return res.status(204).send();
  });

  app.post("/api/certificates/issue", authenticate, requireRole("admin"), async (req, res) => {
    const certificate = normalizeCertificateInput(req.body);
    const validationError = getCertificateInputError(certificate);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const certificateId = createCertificateId();

    try {
      const issued = await issueCertificate(toIssuePayload(certificateId, certificate));

      return res.status(201).json({
        certificateId,
        txHash: issued.txHash,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to issue certificate";
      return res.status(500).json({ message });
    }
  });

  app.post("/api/certificates/bulk-issue", authenticate, requireRole("admin"), async (req, res) => {
    const students = Array.isArray(req.body?.students) ? req.body.students : [];
    const sharedFields = normalizeCertificateInput(req.body);

    if (!sharedFields.certificateType) {
      return res.status(400).json({ message: "Certificate type is required" });
    }

    if (students.length === 0) {
      return res.status(400).json({ message: "At least one student is required" });
    }

    if (students.length > 100) {
      return res.status(400).json({ message: "Bulk issue limit is 100 students per request" });
    }

    const issued = [];
    const failed = [];
    const usedCertificateIds = new Set();

    for (const rawStudent of students) {
      const certificate = {
        ...sharedFields,
        ...normalizeCertificateInput({
          ...rawStudent,
          certificateType: sharedFields.certificateType,
          department: sharedFields.department,
          issueDate: sharedFields.issueDate,
          completionDate: sharedFields.completionDate,
          additionalNotes: rawStudent?.additionalNotes || sharedFields.additionalNotes,
        }),
      };
      const validationError = getCertificateInputError(certificate);

      if (validationError) {
        failed.push({
          studentEmail: certificate.studentEmail,
          studentName: certificate.studentName,
          message: validationError,
        });
        continue;
      }

      let certificateId = createCertificateId();
      while (usedCertificateIds.has(certificateId)) {
        certificateId = createCertificateId();
      }
      usedCertificateIds.add(certificateId);

      try {
        const result = await issueCertificate(toIssuePayload(certificateId, certificate));
        issued.push({
          certificateId,
          txHash: result.txHash,
          studentName: certificate.studentName,
          studentEmail: certificate.studentEmail,
        });
      } catch (error) {
        failed.push({
          studentEmail: certificate.studentEmail,
          studentName: certificate.studentName,
          message: error instanceof Error ? error.message : "Failed to issue certificate",
        });
      }
    }

    const statusCode = failed.length > 0 ? 207 : 201;
    return res.status(statusCode).json({
      total: students.length,
      succeeded: issued.length,
      failedCount: failed.length,
      issued,
      failed,
    });
  });

  if (staticRoot) {
    const sendSpaIndex = (_req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.join(staticRoot, "index.html"));
    };

    app.use(express.static(staticRoot, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          return;
        }

        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      },
    }));

    app.get(/^\/(?!api\/).*/, sendSpaIndex);
  }

  return app;
};

module.exports = {
  AUTH_COOKIE_NAME,
  createApp,
  toPublicTemplate,
  toPublicUser,
};
