import mongoose from 'mongoose';

export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  ABANDONED: 'abandoned',
});

// One row per Paystack charge: the first payment at checkout and every renewal.
const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
    reference: { type: String, required: true, unique: true },
    kind: { type: String, enum: ['initial', 'renewal'], default: 'initial' },
    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },
    planCode: String,
    paidAt: Date,
    channel: String,
    card: { brand: String, last4: String, bank: String },
    gatewayResponse: String,
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

export const Payment = mongoose.model('Payment', paymentSchema);
