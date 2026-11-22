import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderRole: { type: String, enum: ['customer', 'staff', 'system'], required: true },
    senderName: String, // staff first name shown to customers; frozen at send time
    body: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(_d, ret) { delete ret.__v; delete ret._id; return ret; } },
  },
);

chatMessageSchema.index({ conversation: 1, createdAt: 1 });

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
