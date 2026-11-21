import mongoose from 'mongoose';

export const SUBSCRIPTION_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  NON_RENEWING: 'non_renewing',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
});

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    status: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.PENDING,
      index: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },
    startsAt: Date,
    endsAt: { type: Date, index: true },
    cancelledAt: Date,
    paystack: {
      reference: String,
      subscriptionCode: String,
      customerCode: String,
      emailToken: String,
      authorizationCode: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        delete ret._id;
        if (ret.paystack) delete ret.paystack.authorizationCode;
        return ret;
      },
    },
  },
);

subscriptionSchema.index({ user: 1, status: 1 });

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
