import mongoose from 'mongoose';

const contestConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true, immutable: true },
    enabled: { type: Boolean, default: true },
    // Paid plans can always enter; this switch decides for free (Starter) users.
    freeUsersCanEnter: { type: Boolean, default: true },
    // Slip size. On quiet days the minimum drops to the number of matches on the list that day.
    minPicks: { type: Number, default: 10, min: 1, max: 50 },
    maxPicks: { type: Number, default: 20, min: 1, max: 50 },
    // 1 point per correct pick; a slip with no wrong picks has its points multiplied by this.
    perfectMultiplier: { type: Number, default: 2, min: 1, max: 10 },
    rulesNote: { type: String, trim: true, maxlength: 600, default: '' },
  },
  {
    timestamps: true,
    toJSON: { transform(_d, ret) { delete ret.__v; delete ret._id; delete ret.key; return ret; } },
  },
);

contestConfigSchema.statics.getSingleton = function getSingleton() {
  return this.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
};

export const ContestConfig = mongoose.model('ContestConfig', contestConfigSchema);
