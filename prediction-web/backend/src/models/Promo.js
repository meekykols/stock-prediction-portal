import mongoose from 'mongoose';

/**
 * An advert slot on the site, e.g. a contest winner's prize. Nothing shows until staff
 * approve it (status live) and the current time is inside its dates.
 */
const promoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    body: { type: String, trim: true, maxlength: 240 },
    imageUrl: { type: String, trim: true },
    imagePublicId: String,
    linkUrl: { type: String, trim: true },
    linkLabel: { type: String, trim: true, maxlength: 30 },
    startsAt: Date,
    endsAt: Date,
    status: { type: String, enum: ['draft', 'live', 'ended'], default: 'draft' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reward: { type: mongoose.Schema.Types.ObjectId, ref: 'ContestReward' },
    label: { type: String, default: 'Monthly picks champion', trim: true, maxlength: 40 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(_d, ret) { delete ret.__v; delete ret._id; delete ret.imagePublicId; return ret; } },
  },
);

promoSchema.index({ status: 1, startsAt: 1, endsAt: 1 });

export const Promo = mongoose.model('Promo', promoSchema);
