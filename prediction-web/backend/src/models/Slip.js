import mongoose from 'mongoose';

const RESULT = ['pending', 'won', 'lost', 'void'];

const pickSchema = new mongoose.Schema(
  {
    tip: { type: mongoose.Schema.Types.ObjectId, ref: 'Tip', required: true },
    sport: String,
    eventId: Number,
    label: String,
    league: String,
    kickoff: Date,
    market: { type: String, enum: ['1x2', 'winner'] },
    outcome: { type: String, enum: ['home', 'draw', 'away'] },
    // The model's view when the pick was made: training data (crowd vs model).
    modelOutcome: String,
    modelProbability: Number,
    result: { type: String, enum: RESULT, default: 'pending' },
  },
  { _id: false },
);

/** One contest slip per customer per UTC day. Final once submitted. */
const slipSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD (UTC)
    month: { type: String, required: true }, // YYYY-MM, the leaderboard it counts toward
    picks: { type: [pickSchema], required: true },
    required: Number, // minimum that applied when submitted
    status: { type: String, enum: ['pending', 'settled'], default: 'pending' },
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
    voided: { type: Number, default: 0 },
    perfect: { type: Boolean, default: false },
    points: { type: Number, default: 0 },
    settledAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(_d, ret) { delete ret.__v; delete ret._id; return ret; } },
  },
);

slipSchema.index({ user: 1, date: 1 }, { unique: true });
slipSchema.index({ month: 1, status: 1 });
slipSchema.index({ status: 1 });

export const Slip = mongoose.model('Slip', slipSchema);
