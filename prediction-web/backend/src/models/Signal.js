import mongoose from 'mongoose';

// One scheduled model output per instrument per day, published to the premium feed.
const signalSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['market', 'sports'], required: true },
    assetClass: { type: String, enum: ['stock', 'forex', 'commodity', 'crypto'] }, // market signals only
    key: { type: String, required: true }, // Yahoo symbol or fixture id
    runDate: { type: String, required: true, index: true }, // YYYY-MM-DD (UTC)
    title: { type: String, required: true },
    subtitle: String,
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },
    strength: { type: Number, default: 0 }, // for ordering: |% move| or pick probability
    result: { type: mongoose.Schema.Types.Mixed, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(_d, ret) { delete ret.__v; delete ret._id; return ret; } },
  },
);

signalSchema.index({ type: 1, key: 1, runDate: 1 }, { unique: true });

export const Signal = mongoose.model('Signal', signalSchema);
