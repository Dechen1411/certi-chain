const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "student"], required: true },
    name: { type: String, required: true },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
    versionKey: false,
  },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

const connectDb = async (mongoUri) => {
  await mongoose.connect(mongoUri);
};

module.exports = { User, connectDb };
