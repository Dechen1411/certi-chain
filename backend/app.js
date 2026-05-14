const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
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
  return `CERT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
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

const getCertificateInputError = (certificate) => {
  if (
    !certificate.studentName ||
    !certificate.studentEmail ||
    !certificate.studentWalletAddress ||
    !certificate.certificateType
  ) {
    return "Missing required certificate fields";
  }

  return "";
};

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

const toPublicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  name: user.name,
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

const createApp = ({
  User,
  issueCertificate,
  frontendOrigin,
  jwtSecret,
  jwtExpiresIn,
  allowedStudentDomain,
  isProduction,
  staticRoot,
}) => {
  if (!jwtSecret) {
    throw new Error("Missing JWT_SECRET in backend environment");
  }

  const authCookieMaxAge = parseExpiresInMs(jwtExpiresIn);
  const authCookieOptions = createAuthCookieOptions(isProduction, authCookieMaxAge);
  const allowedOrigins = [
    frontendOrigin,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];

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

  app.use(helmet());
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
      return res.status(403).json({ message: "Forbidden" });
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

  app.get("/api/auth/me", authenticate, async (req, res) => {
    const userQuery = User.findOne({ id: req.auth.sub });
    if (typeof userQuery?.select === "function") {
      userQuery.select("id username email role name");
    }

    const user = await executeMaybeLean(userQuery);
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    return res.json({ user: toPublicUser(user) });
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
    app.use(express.static(staticRoot));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(staticRoot, "index.html"));
    });
  }

  return app;
};

module.exports = {
  AUTH_COOKIE_NAME,
  createApp,
  toPublicUser,
};
