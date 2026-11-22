import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastMessage: { body: String, senderRole: String },
    unread: {
      customer: { type: Number, default: 0 },
      staff: { type: Number, default: 0 },
    },
    closedAt: Date,
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(_d, ret) { delete ret.__v; delete ret._id; return ret; } },
  },
);

conversationSchema.index({ customer: 1, status: 1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
