import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, BrainCircuit, CandlestickChart, Gauge, LineChart,
  MessagesSquare, ShieldCheck, Trophy, UserPlus, Zap,
} from 'lucide-react';
import SectionHeading from '../../components/ui/SectionHeading';
import ForecastVisual from '../../components/ui/ForecastVisual';
import PricingGrid from '../../components/ui/PricingGrid';
import Faq from '../../components/ui/Faq';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAuth } from '../../hooks/useAuth';

const COVERAGE = [
  'AAPL', 'Premier League', 'NVDA', 'La Liga', 'TSLA', 'Serie A', 'MSFT',
  'Bundesliga', 'AMZN', 'Champions League', 'GOOGL', 'Ligue 1', 'META',
];

const FEATURES = [
  { icon: CandlestickChart, title: 'Stock forecasts', text: 'LSTM models trained on a decade of daily prices forecast where a ticker is heading, with 100- and 200-day moving averages for context.' },
  { icon: Trophy, title: 'Sports analysis', text: 'Form, head-to-head records and team statistics combine into match predictions with clear probability estimates.' },
  { icon: Gauge, title: 'Transparent accuracy', text: 'Every forecast ships with R², RMSE and MSE. You see how well the model fits before you rely on it.' },
  { icon: Zap, title: 'Premium signals', text: 'A curated feed of the strongest model outputs, delivered to your dashboard as soon as they are generated.' },
  { icon: MessagesSquare, title: 'Live support', text: 'Talk to a real person from inside the app. Paid plans get live chat with priority for Elite members.' },
  { icon: ShieldCheck, title: 'Secure payments', text: 'Subscriptions are billed through Paystack. Cancel any time from your billing page.' },
];

const STEPS = [
  { icon: UserPlus, title: 'Create a free account', text: 'Sign up in under a minute. No card needed for the Starter plan.' },
  { icon: BrainCircuit, title: 'Run a prediction', text: 'Enter a ticker or pick a fixture. The models return a forecast with accuracy metrics.' },
  { icon: LineChart, title: 'Upgrade when ready', text: 'Move to Pro or Elite for more daily predictions, premium signals and live chat.' },
];

function Hero() {
  const { siteName } = useSiteConfig();
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative isolate">
      <div className="bg-grid absolute inset-0 -z-10" />
      <div className="glow-orb -top-24 left-1/4 -z-10 size-[28rem] bg-primary/25" />
      <div className="glow-orb top-40 right-0 -z-10 size-[24rem] bg-secondary/25" />

      <div className="container-x grid items-center gap-14 pt-16 pb-20 lg:grid-cols-2 lg:pt-24">
        <div>
          <span className="eyebrow"><Activity className="size-3.5" /> Machine-learning predictions</span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
            Predict the market.<br />
            <span className="text-gradient">Read the game.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-base-content/70">
            {siteName} turns deep-learning models into clear, measurable forecasts for stocks and sports.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={isAuthenticated ? '/app' : '/register'} className="btn btn-primary btn-lg rounded-full">
              {isAuthenticated ? 'Open dashboard' : 'Start free'} <ArrowRight className="size-5" />
            </Link>
            <Link to="/pricing" className="btn btn-ghost btn-lg rounded-full border border-base-content/15">View plans</Link>
          </div>
          <p className="mt-4 text-sm text-base-content/50">Free plan available · No card required</p>
        </div>

        <div className="relative animate-float">
          <div className="glass-card p-5 shadow-2xl shadow-primary/10 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary"><CandlestickChart className="size-5" /></div>
                <div>
                  <p className="font-mono text-sm font-medium">TICKER / LSTM-100</p>
                  <p className="text-xs text-base-content/50">Actual vs forecast</p>
                </div>
              </div>
              <span className="badge badge-ghost badge-sm">Illustrative</span>
            </div>
            <div className="mt-6 text-base-content"><ForecastVisual /></div>
            <div className="mt-4 flex items-center gap-5 text-xs text-base-content/60">
              <span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-primary" /> Actual</span>
              <span className="flex items-center gap-2"><span className="h-0.5 w-5 border-t-2 border-dashed border-secondary" /> Forecast</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {['R²', 'RMSE', 'MSE'].map((m) => (
                <div key={m} className="rounded-field border border-base-content/10 bg-base-100/50 px-3 py-2.5">
                  <p className="font-mono text-xs text-base-content/50">{m}</p>
                  <p className="mt-0.5 text-sm font-medium">Per run</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CoverageMarquee() {
  const items = [...COVERAGE, ...COVERAGE];
  return (
    <section className="border-y border-base-content/10 bg-base-200/40 py-5" aria-label="Coverage">
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max animate-marquee gap-10">
          {items.map((item, i) => (
            <span key={`${item}-${i}`} className="flex items-center gap-3 whitespace-nowrap font-mono text-sm text-base-content/60">
              <span className={`size-1.5 rounded-full ${/^[A-Z]+$/.test(item) ? 'bg-primary' : 'bg-secondary'}`} />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  useDocumentTitle();
  const { siteName } = useSiteConfig();
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Hero />
      <CoverageMarquee />

      <section className="container-x py-24" id="features">
        <SectionHeading
          eyebrow="Platform"
          title="Everything you need to make sharper calls"
          subtitle="Forecasts, context and accuracy metrics in one dashboard, for markets and matches."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="glass-card glass-card-hover p-6">
              <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 text-primary">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-base-content/70">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative py-24">
        <div className="glow-orb left-1/2 top-1/2 -z-10 size-[30rem] -translate-x-1/2 -translate-y-1/2 bg-primary/10" />
        <div className="container-x">
          <SectionHeading eyebrow="How it works" title="From sign-up to first forecast in minutes" />
          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="glass-card relative p-6">
                <span className="absolute right-5 top-4 font-display text-5xl font-bold text-base-content/5">0{i + 1}</span>
                <Icon className="size-6 text-secondary" />
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-base-content/70">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-x py-24" id="pricing">
        <SectionHeading eyebrow="Pricing" title="Simple plans that scale with you" subtitle="Start free. Upgrade for more predictions, premium signals and live support." />
        <div className="mt-14"><PricingGrid /></div>
      </section>

      <section className="container-x py-24">
        <SectionHeading eyebrow="FAQ" title="Questions, answered" />
        <div className="mt-12"><Faq /></div>
      </section>

      <section className="container-x">
        <div className="relative overflow-hidden rounded-box border border-primary/30 bg-gradient-to-br from-primary/20 via-base-200 to-secondary/20 px-6 py-16 text-center sm:px-16">
          <div className="bg-grid absolute inset-0 opacity-60" />
          <div className="relative">
            <h2 className="text-3xl font-bold sm:text-4xl">Ready to see what the models see?</h2>
            <p className="mx-auto mt-4 max-w-xl text-base-content/70">Join {siteName} free and run your first prediction today.</p>
            <Link to={isAuthenticated ? '/app' : '/register'} className="btn btn-primary btn-lg mt-8 rounded-full">
              {isAuthenticated ? 'Go to dashboard' : 'Create free account'} <ArrowRight className="size-5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
