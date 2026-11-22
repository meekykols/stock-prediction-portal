import mongoose from 'mongoose';
import { SPORTS } from '../constants/sports.js';

const { Mixed } = mongoose.Schema.Types;
const side = { _id: false, id: Number, name: String, logo: String };

/**
 * One published tip per event. Generated before the start, never changed after kick-off,
 * then settled from the final result. Kept forever: it's the track record and training data.
 */
const tipSchema = new mongoose.Schema(
  {
    sport: { type: String, enum: SPORTS, required: true },
    eventId: { type: Number, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD (UTC) of the start
    kickoff: { type: Date, required: true },
    league: { _id: false, id: Number, name: String, country: String, logo: String, season: Mixed },
    home: side,
    away: side,
    extra: { type: Mixed, default: {} },
    model: { _id: false, name: String, description: String },
    prediction: {
      _id: false,
      pick: { _id: false, market: String, outcome: String, probability: Number },
      probabilities: Mixed,
      predictedScore: Mixed,
      markets: Mixed,
      confidence: { type: String, enum: ['low', 'medium', 'high'] },
      details: Mixed,
      inputs: Mixed,
    },
    featured: { type: Boolean, default: false }, // "Top tip"
    generatedAt: Date,
    status: { _id: false, short: String, long: String, state: String },
    result: {
      _id: false,
      state: { type: String, enum: ['pending', 'won', 'lost', 'void'], default: 'pending' },
      score: Mixed,
      winner: String,
      markets: Mixed, // [{key, line, outcome, won}]
      settledAt: Date,
      note: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(_d, ret) { delete ret.__v; delete ret._id; return ret; } },
  },
);

tipSchema.index({ sport: 1, eventId: 1 }, { unique: true });
tipSchema.index({ date: 1, sport: 1, kickoff: 1 });
tipSchema.index({ 'result.state': 1, kickoff: 1 });

export const Tip = mongoose.model('Tip', tipSchema);
