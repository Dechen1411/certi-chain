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

const connectDb = async (mongoUri) => {
  await mongoose.connect(mongoUri);
};

module.exports = { CertificateTemplate, User, connectDb };
