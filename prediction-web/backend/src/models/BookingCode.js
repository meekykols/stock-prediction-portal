import mongoose from 'mongoose';

export const CODE_MARKETS = Object.freeze(['1x2', 'winner', 'dc', 'total', 'btts']);
const RESULT = ['pending', 'won', 'lost', 'void'];

const selectionSchema = new mongoose.Schema(
  {
    // Linked to one of our tips: settles itself from that event's result. Without a tip, staff settle it by hand.
    tip: { type: mongoose.Schema.Types.ObjectId, ref: 'Tip' },
    sport: String,
    label: { type: String, required: true, trim: true, maxlength: 120 }, // "Arsenal v Wolves"
    league: String,
    kickoff: Date,
    market: { type: String, enum: CODE_MARKETS, required: true },
    outcome: { type: String, required: true }, // home/draw/away, 1X/X2/12, over/under, yes/no
    line: Number,
    result: { type: String, enum: RESULT, default: 'pending' },
  },
  { _id: false },
);

/** A bookmaker booking code shared by staff, with its selections and track record. */
const bookingCodeSchema = new mongoose.Schema(
  {
    platform: { type: String, required: true, index: true }, // platform slug from CodesConfig
    code: { type: String, required: true, trim: true, maxlength: 40 },
    odds: { type: Number, min: 1 },
    note: { type: String, trim: true, maxlength: 300 },
    selections: { type: [selectionSchema], default: [] },
    expiresAt: { type: Date, required: true, index: true }, // first kick-off, or set by staff
    status: { type: String, enum: ['active', 'withdrawn'], default: 'active' },
    result: {
      _id: false,
      state: { type: String, enum: RESULT, default: 'pending' },
      settledAt: Date,
      note: String,
      manual: { type: Boolean, default: false },
    },
    copies: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(_d, ret) { delete ret.__v; delete ret._id; return ret; } },
  },
);

bookingCodeSchema.index({ status: 1, expiresAt: -1 });
bookingCodeSchema.index({ 'result.state': 1 });

export const BookingCode = mongoose.model('BookingCode', bookingCodeSchema);
