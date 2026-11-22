import axios from 'axios';
import {
  ContactMessage, Payment, PAYMENT_STATUS, Prediction, Subscription, User,
} from '../models/index.js';
import { env } from '../config/env.js';
import { paystackEnabled } from './paystack.client.js';
import { liveSubscriptionFilter } from './subscription.service.js';

const DAY = 24 * 60 * 60 * 1000;
const MONTHS = { monthly: 1, quarterly: 3, annually: 12 };

function lastNDays(n) {
  const days = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    days.push(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i)).toISOString().slice(0, 10));
  }
  return days;
}

const fillSeries = (days, rows, field = 'value') => {
  const map = Object.fromEntries(rows.map((r) => [r._id, r[field]]));
  return days.map((date) => ({ date, value: map[date] || 0 }));
};

export async function dashboardStats() {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY);
  const since7 = new Date(now.getTime() - 7 * DAY);
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const days = lastNDays(30);
  const seriesStart = new Date(`${days[0]}T00:00:00.000Z`);

  const [
    totalCustomers, new7, new30, liveByPlan, revenue30, revenueByDay, signupsByDay,
    predictionsToday, predictions30, newMessages, attention,
  ] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'customer', createdAt: { $gte: since7 } }),
    User.countDocuments({ role: 'customer', createdAt: { $gte: since30 } }),
    Subscription.aggregate([
      { $match: liveSubscriptionFilter(now) },
      { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'plan' } },
      { $unwind: '$plan' },
      {
        $group: {
          _id: '$plan._id',
          name: { $first: '$plan.name' },
          price: { $first: '$plan.price' },
          interval: { $first: '$plan.interval' },
          currency: { $first: '$plan.currency' },
          count: { $sum: 1 },
          paying: { $sum: { $cond: [{ $and: [{ $eq: ['$source', 'paystack'] }, { $eq: ['$status', 'active'] }] }, 1, 0] } },
          complimentary: { $sum: { $cond: [{ $eq: ['$source', 'admin'] }, 1, 0] } },
        },
      },
      { $sort: { price: 1 } },
    ]),
    Payment.aggregate([
      { $match: { status: PAYMENT_STATUS.SUCCESS, paidAt: { $gte: since30 } } },
      { $group: { _id: '$currency', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { status: PAYMENT_STATUS.SUCCESS, paidAt: { $gte: seriesStart } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } }, value: { $sum: '$amount' } } },
    ]),
    User.aggregate([
      { $match: { role: 'customer', createdAt: { $gte: seriesStart } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, value: { $sum: 1 } } },
    ]),
    Prediction.aggregate([
      { $match: { createdAt: { $gte: startOfDay } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    Prediction.countDocuments({ createdAt: { $gte: since30 } }),
    ContactMessage.countDocuments({ status: 'new' }),
    Subscription.countDocuments({ ...liveSubscriptionFilter(now), paymentIssueAt: { $ne: null } }),
  ]);

  // Monthly recurring revenue: auto-renewing Paystack subscriptions, normalised to one month.
  const mrr = liveByPlan.reduce((sum, p) => sum + (p.paying * p.price) / (MONTHS[p.interval] || 1), 0);
  const currency = liveByPlan[0]?.currency || revenue30[0]?._id || 'NGN';

  return {
    currency,
    customers: { total: totalCustomers, new7, new30 },
    subscriptions: {
      live: liveByPlan.reduce((s, p) => s + p.count, 0),
      paying: liveByPlan.reduce((s, p) => s + p.paying, 0),
      paymentIssues: attention,
      byPlan: liveByPlan.map(({ _id, ...rest }) => ({ planId: _id, ...rest })),
    },
    revenue: {
      mrr: Math.round(mrr),
      last30: revenue30.reduce((s, r) => s + r.total, 0),
      payments30: revenue30.reduce((s, r) => s + r.count, 0),
      series: fillSeries(days, revenueByDay),
    },
    signups: { series: fillSeries(days, signupsByDay) },
    predictions: {
      today: Object.fromEntries(predictionsToday.map((p) => [p._id, p.count])),
      last30: predictions30,
    },
    messages: { new: newMessages },
  };
}

export async function serviceHealth() {
  let ml = { ok: false };
  try {
    const res = await axios.get(`${env.mlService.url.replace(/\/$/, '')}/health/`, { timeout: 3000 });
    ml = { ok: true, stockModelLoaded: res.data.stockModelLoaded, sportsDataConfigured: res.data.sportsDataConfigured };
  } catch {
    /* offline */
  }
  return {
    api: { ok: true },
    mlService: ml,
    payments: { ok: paystackEnabled() },
  };
}
