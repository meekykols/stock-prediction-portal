import mongoose from 'mongoose';

/** A prize given to a contest winner. Admin decides the type. */
const contestRewardSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, index: true }, // YYYY-MM
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rank: Number,
    points: Number,
    type: { type: String, enum: ['cash', 'elite', 'advert'], required: true },
    amount: Number, // cash, in kobo
    currency: { type: String, default: 'NGN' },
    // cash: pending → paid. elite: granted. advert: pending until the promo goes live.
    status: { type: String, enum: ['pending', 'paid', 'granted', 'live'], default: 'pending' },
    note: { type: String, trim: true, maxlength: 300 },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
    promo: { type: mongoose.Schema.Types.ObjectId, ref: 'Promo' },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paidAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(_d, ret) { delete ret.__v; delete ret._id; return ret; } },
  },
);

export const ContestReward = mongoose.model('ContestReward', contestRewardSchema);
