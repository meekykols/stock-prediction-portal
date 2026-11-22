import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    tagline: { type: String, trim: true },
    // Smallest currency unit (kobo). 0 = free plan.
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'NGN', uppercase: true },
    interval: { type: String, enum: ['monthly', 'quarterly', 'annually'], default: 'monthly' },
    features: [{ type: String, trim: true }],
    limits: {
      // -1 means unlimited
      stockPredictionsPerDay: { type: Number, default: 3 },
      sportsPredictionsPerDay: { type: Number, default: 3 },
      premiumSignals: { type: Boolean, default: false },
      liveChat: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
    },
    highlighted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    paystackPlanCode: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        delete ret._id;
        return ret;
      },
    },
  },
);

planSchema.virtual('isFree').get(function isFree() {
  return this.price === 0;
});

export const Plan = mongoose.model('Plan', planSchema);
