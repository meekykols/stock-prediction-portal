import mongoose from 'mongoose';

// market = stocks, forex, commodities and crypto (see input.assetClass)
export const PREDICTION_TYPES = Object.freeze({ MARKET: 'market', SPORTS: 'sports' });
export const ASSET_CLASSES = Object.freeze(['stock', 'forex', 'commodity', 'crypto']);

const predictionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: Object.values(PREDICTION_TYPES), required: true },
    // What was asked: { assetClass, symbol, horizon } or { fixtureId }. `key` identifies repeats.
    input: { type: mongoose.Schema.Types.Mixed, required: true },
    key: { type: String, required: true },
    // Small fields for lists and cards; `result` holds the full ML payload.
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },
    result: { type: mongoose.Schema.Types.Mixed, required: true, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        delete ret._id;
        return ret;
      },
    },
  },
);

predictionSchema.index({ user: 1, type: 1, createdAt: -1 });
predictionSchema.index({ user: 1, key: 1, createdAt: -1 });

export const Prediction = mongoose.model('Prediction', predictionSchema);
