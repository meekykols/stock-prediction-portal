import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ALL_PERMISSIONS, ROLES } from '../utils/permissions.js';

const imageSchema = new mongoose.Schema(
  { url: String, publicId: String },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    phone: { type: String, trim: true },
    country: { type: String, trim: true },
    avatar: imageSchema,
    role: { type: String, enum: Object.values(ROLES), default: ROLES.CUSTOMER, index: true },
    permissions: [{ type: String, enum: ALL_PERMISSIONS }],
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    emailVerified: { type: Boolean, default: false },
    lastLoginAt: Date,
    // Linked Telegram chat for signal alerts (set by the bot after /start <code>).
    telegram: {
      chatId: { type: String, index: true },
      username: String,
      linkedAt: Date,
    },
    preferences: {
      theme: { type: String, enum: ['dark', 'light', 'system'], default: 'system' },
      language: { type: String, default: 'en' },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        delete ret._id;
        return ret;
      },
    },
  },
);

userSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model('User', userSchema);
