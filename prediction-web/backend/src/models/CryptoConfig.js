import mongoose from 'mongoose';

const cryptoConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true, immutable: true },
    enabled: { type: Boolean, default: true },
    // Pause posting and notifications around big news; tracking of open trades continues.
    paused: { on: { type: Boolean, default: false }, reason: String, until: Date },
    styles: {
      swing: { enabled: { type: Boolean, default: true }, timeframes: { type: [String], default: () => ['1h', '4h'] } },
      day: { enabled: { type: Boolean, default: true }, timeframes: { type: [String], default: () => ['15m'] } },
    },
    coins: {
      top: { enabled: { type: Boolean, default: true }, n: { type: Number, default: 10, min: 1, max: 100 }, exchange: { type: String, default: 'binance' } },
      fixed: { enabled: { type: Boolean, default: true }, list: { type: [String], default: () => ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'] } },
    },
    exchanges: { binance: { type: Boolean, default: true }, bybit: { type: Boolean, default: true } },
    // Plans (by slug) that see each kind of signal live. Closed signals are visible to everyone.
    plans: {
      manual: { type: [String], default: () => ['pro', 'elite'] },
      swing: { type: [String], default: () => ['elite'] },
      day: { type: [String], default: () => ['elite'] },
    },
    rules: {
      feePct: { type: Number, default: 0.0005, min: 0, max: 0.01 }, // per side, taker
      breakeven: { type: Boolean, default: true },
      limitExpiryHours: { swing: { type: Number, default: 24 }, day: { type: Number, default: 4 } },
      maxHoldHours: { swing: { type: Number, default: 168 }, day: { type: Number, default: 24 } },
      maxEntryDistancePct: { type: Number, default: 15 }, // limit entries this far from price are refused
    },
    telegram: { enabled: { type: Boolean, default: true } },
  },
  {
    timestamps: true,
    toJSON: { transform(_d, ret) { delete ret.__v; delete ret._id; delete ret.key; return ret; } },
  },
);

cryptoConfigSchema.statics.getSingleton = function getSingleton() {
  return this.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
};

export const CryptoConfig = mongoose.model('CryptoConfig', cryptoConfigSchema);
