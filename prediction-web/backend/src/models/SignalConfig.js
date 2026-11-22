import mongoose from 'mongoose';

const signalConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true, immutable: true },
    enabled: { type: Boolean, default: true },
    markets: {
      enabled: { type: Boolean, default: true },
      // What staff type; resolved to Yahoo symbols at run time (e.g. "EUR/USD", "gold", "BTC").
      watchlist: {
        stock: { type: [String], default: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN'] },
        forex: { type: [String], default: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/NGN'] },
        commodity: { type: [String], default: ['Gold', 'Crude oil (WTI)', 'Silver'] },
        crypto: { type: [String], default: ['BTC', 'ETH', 'SOL'] },
      },
      horizon: { type: Number, default: 5, min: 1, max: 30 },
    },
    sports: {
      enabled: { type: Boolean, default: true },
      maxPerRun: { type: Number, default: 8, min: 1, max: 30 },
    },
  },
  {
    timestamps: true,
    toJSON: { transform(_d, ret) { delete ret.__v; delete ret._id; delete ret.key; return ret; } },
  },
);

signalConfigSchema.statics.getSingleton = function getSingleton() {
  return this.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
};

export const SignalConfig = mongoose.model('SignalConfig', signalConfigSchema);
