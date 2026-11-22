import mongoose from 'mongoose';

// One-time code a customer sends to the bot (/start <code>) to link their Telegram chat.
const telegramLinkSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
});
telegramLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TelegramLink = mongoose.model('TelegramLink', telegramLinkSchema);
