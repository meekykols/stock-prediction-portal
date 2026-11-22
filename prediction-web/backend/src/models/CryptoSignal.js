import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  { type: String, index: Number, price: Number, at: Date, outcome: String, resultR: Number },
  { _id: false },
);

/**
 * A futures trade signal (posted by staff, or by a strategy later), tracked against live
 * 1-minute candles until it closes. Results are in R: multiples of the initial risk.
 */
const cryptoSignalSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ['manual', 'auto'], required: true },
    strategy: String, // auto signals: strategy id
    style: { type: String, enum: ['swing', 'day'], required: true },
    exchange: { type: String, enum: ['binance', 'bybit'], required: true },
    symbol: { type: String, required: true }, // e.g. BTCUSDT
    base: String, // BTC
    timeframe: { type: String, enum: ['15m', '1h', '4h'], required: true },
    side: { type: String, enum: ['long', 'short'], required: true },
    entryType: { type: String, enum: ['market', 'limit'], required: true },
    entry: { type: Number, required: true },
    sl: { type: Number, required: true },
    tps: { type: [Number], required: true },
    rr: [Number], // reward:risk of each TP
    note: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    priceAtPost: Number,

    // Tracking state (see utils/signalMath.js)
    status: { type: String, enum: ['pending', 'active', 'closed', 'expired', 'cancelled'], required: true, index: true },
    stop: Number, // current stop (moves to entry after TP1)
    tpHit: [Boolean],
    remaining: Number,
    realizedR: Number,
    feePct: Number,
    breakeven: Boolean,
    lastCandleT: Number,
    expiresAt: Date, // limit entries: unfilled by then → expired
    maxHoldUntil: Date, // open trades closed at market by then
    filledAt: Date,
    closedAt: Date,
    outcome: String, // sl | tp1 | tp2 | tp3 | time | manual | expired | cancelled
    resultR: Number,
    events: { type: [eventSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(_d, ret) { delete ret.__v; delete ret._id; return ret; } },
  },
);

cryptoSignalSchema.index({ status: 1, createdAt: -1 });
cryptoSignalSchema.index({ closedAt: -1 });

export const CryptoSignal = mongoose.model('CryptoSignal', cryptoSignalSchema);
