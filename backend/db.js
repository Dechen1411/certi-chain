const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "student"], required: true },
    name: { type: String, required: true },
    walletAddress: { type: String, default: "" },
    walletAddressNormalized: { type: String, default: "", index: true },
    privyUserId: { type: String, default: "" },
    walletVerifiedAt: { type: Date },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
    versionKey: false,
  },
);

userSchema.index(
  { walletAddressNormalized: 1 },
  {
    unique: true,
    partialFilterExpression: {
      walletAddressNormalized: { $type: "string", $ne: "" },
    },
  },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

const certificateTemplateSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: "", trim: true },
    body: { type: String, default: "", trim: true },
    footer: { type: String, default: "", trim: true },
    color: { type: String, default: "from-slate-700 to-slate-900", trim: true },
    uses: { type: Number, default: 0, min: 0 },
    createdBy: { type: String, default: "", index: true },
    updatedBy: { type: String, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const CertificateTemplate = mongoose.models.CertificateTemplate ||
  mongoose.model("CertificateTemplate", certificateTemplateSchema);

const certificateSchema = new mongoose.Schema(
  {
    certificateId: { type: String, required: true, unique: true, index: true },
    tokenId: { type: String, default: "", index: true },
    txHash: { type: String, required: true, index: true },
    certificateHash: { type: String, default: "", index: true },
    tokenUri: { type: String, default: "" },
    studentName: { type: String, required: true, trim: true },
    studentEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    studentId: { type: String, default: "", trim: true },
    studentWalletAddress: { type: String, required: true, trim: true },
    studentWalletAddressNormalized: { type: String, required: true, index: true },
    certificateType: { type: String, required: true, trim: true },
    department: { type: String, default: "", trim: true },
    grade: { type: String, default: "", trim: true },
    issueDate: { type: String, required: true, trim: true },
    completionDate: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    revoked: { type: Boolean, default: false, index: true },
    issuedAt: { type: Date, default: Date.now, index: true },
    issuedBy: { type: String, default: "", index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

certificateSchema.index({ studentWalletAddressNormalized: 1, issuedAt: -1 });
certificateSchema.index({ issuedAt: -1, createdAt: -1 });

const Certificate = mongoose.models.Certificate ||
  mongoose.model("Certificate", certificateSchema);

const connectDb = async (mongoUri) => {
  await mongoose.connect(mongoUri);
};

module.exports = { Certificate, CertificateTemplate, User, connectDb };
