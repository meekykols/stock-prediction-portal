import mongoose from 'mongoose';
import { DEFAULT_LEAGUES, SPORTS } from '../constants/sports.js';

const sportSchema = (sport) => ({
  enabled: { type: Boolean, default: true },
  leagues: { type: [Number], default: () => [...DEFAULT_LEAGUES[sport]] },
});

const tipsConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true, immutable: true },
    enabled: { type: Boolean, default: true },
    sports: Object.fromEntries(SPORTS.map((s) => [s, sportSchema(s)])),
    // Plans (by slug) that see every tip before kick-off. Everyone else, guests included,
    // sees `previewCount` tips per sport per day; finished tips are always visible.
    fullAccessPlans: { type: [String], default: () => ['pro', 'elite'] },
    previewCount: { type: Number, default: 3, min: 0, max: 50 },
    // A tip is a "Top tip" when the model rates it high confidence.
    featuredConfidence: { type: String, enum: ['high', 'medium'], default: 'high' },
    // Bookmaker odds: combined with the model, or used alone when the model has no data.
    odds: {
      enabled: { type: Boolean, default: true },
      marketWeight: { type: Number, default: 0.6, min: 0, max: 1 }, // share of the bookmakers' view
      valueEdge: { type: Number, default: 0.05, min: 0, max: 0.5 }, // model minus market to flag "value"
      maxCallsPerRun: { type: Number, default: 40, min: 0, max: 1000 }, // per sport and day; protects the API quota
    },
  },
  {
    timestamps: true,
    toJSON: { transform(_d, ret) { delete ret.__v; delete ret._id; delete ret.key; return ret; } },
  },
);

tipsConfigSchema.statics.getSingleton = function getSingleton() {
  return this.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
};

export const TipsConfig = mongoose.model('TipsConfig', tipsConfigSchema);
