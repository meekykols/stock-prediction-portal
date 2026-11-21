/**
 * Seeds default plans and the site config. Safe to re-run: existing plans
 * (matched by slug) and existing site settings are left untouched.
 *
 *   npm run seed
 */
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Plan, SiteConfig } from '../src/models/index.js';

// Prices are in kobo (₦1 = 100 kobo). Adjust from the admin console later.
const PLANS = [
  {
    name: 'Starter',
    slug: 'starter',
    tagline: 'Explore the platform',
    price: 0,
    features: [
      '3 stock predictions per day',
      '3 sports predictions per day',
      'Daily market overview',
      'Community support',
    ],
    limits: { stockPredictionsPerDay: 3, sportsPredictionsPerDay: 3, premiumSignals: false, liveChat: false, apiAccess: false },
    sortOrder: 0,
  },
  {
    name: 'Pro',
    slug: 'pro',
    tagline: 'For active traders and punters',
    price: 500000,
    features: [
      '50 stock predictions per day',
      '50 sports predictions per day',
      'Premium signals feed',
      'Model accuracy reports',
      'Live chat support',
    ],
    limits: { stockPredictionsPerDay: 50, sportsPredictionsPerDay: 50, premiumSignals: true, liveChat: true, apiAccess: false },
    highlighted: true,
    sortOrder: 1,
  },
  {
    name: 'Elite',
    slug: 'elite',
    tagline: 'Unlimited, with API access',
    price: 1500000,
    features: [
      'Unlimited stock predictions',
      'Unlimited sports predictions',
      'Premium signals feed',
      'Priority live chat',
      'API access',
    ],
    limits: { stockPredictionsPerDay: -1, sportsPredictionsPerDay: -1, premiumSignals: true, liveChat: true, apiAccess: true },
    sortOrder: 2,
  },
];

async function run() {
  await connectDB();

  for (const plan of PLANS) {
    const res = await Plan.updateOne({ slug: plan.slug }, { $setOnInsert: plan }, { upsert: true });
    console.log(`${res.upsertedCount ? 'created' : 'exists '}  plan ${plan.slug}`);
  }

  const existing = await SiteConfig.exists({ key: 'main' });
  if (!existing) {
    await SiteConfig.create({
      key: 'main',
      siteName: 'Prediction Web',
      tagline: 'AI-powered market and sports predictions',
      description:
        'Machine-learning forecasts for stocks and sports, delivered in a clean dashboard with transparent accuracy metrics.',
      contact: {
        email: 'hello@example.com',
        supportEmail: 'support@example.com',
        phone: '+234 000 000 0000',
        address: 'Lagos, Nigeria',
        supportHours: 'Mon–Fri, 9am–6pm WAT',
      },
      seo: {
        title: 'Prediction Web — AI stock and sports predictions',
        description: 'Machine-learning forecasts for stocks and sports.',
        keywords: ['stock prediction', 'sports prediction', 'AI', 'LSTM'],
      },
      legal: { companyName: 'Prediction Web Ltd' },
    });
    console.log('created  site config (placeholder contact details — edit them in the admin console)');
  } else {
    console.log('exists   site config');
  }

  await disconnectDB();
}

run().catch(async (err) => {
  console.error(err);
  await disconnectDB();
  process.exit(1);
});
