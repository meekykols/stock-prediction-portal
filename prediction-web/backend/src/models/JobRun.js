import mongoose from 'mongoose';

const jobRunSchema = new mongoose.Schema(
  {
    job: { type: String, enum: ['stock-signals', 'sports-signals'], required: true, index: true },
    trigger: { type: String, enum: ['schedule', 'manual'], default: 'schedule' },
    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['running', 'success', 'partial', 'failed', 'skipped'], default: 'running' },
    startedAt: { type: Date, default: Date.now },
    finishedAt: Date,
    created: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    errors: [String],
    note: String,
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
    toJSON: { virtuals: true, transform(_d, ret) { delete ret.__v; delete ret._id; return ret; } },
  },
);

export const JobRun = mongoose.model('JobRun', jobRunSchema);
