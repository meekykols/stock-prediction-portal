import mongoose from 'mongoose';

const platformSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    website: { type: String, trim: true },
    color: { type: String, trim: true, default: '#22d3ee' },
    active: { type: Boolean, default: true },
  },
  { _id: false },
);

const DEFAULT_PLATFORMS = [
  ['bet9ja', 'Bet9ja', 'https://sports.bet9ja.com', '#0a7a3d'],
  ['sportybet', 'SportyBet', 'https://www.sportybet.com/ng', '#e41827'],
  ['betking', 'BetKing', 'https://www.betking.com', '#1c3f94'],
  ['1xbet', '1xBet', 'https://1xbet.ng', '#1a5fa8'],
  ['betway', 'Betway', 'https://www.betway.com.ng', '#00a826'],
  ['msport', 'MSport', 'https://www.msport.com/ng', '#f5c400'],
  ['nairabet', 'NairaBet', 'https://www.nairabet.com', '#d32f2f'],
  ['merrybet', 'MerryBet', 'https://www.merrybet.com', '#e65100'],
  ['betwinner', 'BetWinner', 'https://betwinner.ng', '#2e7d32'],
  ['22bet', '22Bet', 'https://22bet.ng', '#1565c0'],
  ['paripesa', 'PariPesa', 'https://paripesa.ng', '#283593'],
].map(([slug, name, website, color]) => ({ slug, name, website, color, active: true }));

const codesConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true, immutable: true },
    enabled: { type: Boolean, default: true },
    // Plans (by slug) that can see active codes. Everyone else sees a locked card.
    visiblePlans: { type: [String], default: () => ['pro', 'elite'] },
    platforms: { type: [platformSchema], default: () => DEFAULT_PLATFORMS },
  },
  {
    timestamps: true,
    toJSON: { transform(_d, ret) { delete ret.__v; delete ret._id; delete ret.key; return ret; } },
  },
);

codesConfigSchema.statics.getSingleton = function getSingleton() {
  return this.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
};

export const CodesConfig = mongoose.model('CodesConfig', codesConfigSchema);
