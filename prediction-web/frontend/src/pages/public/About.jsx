import { Link } from 'react-router-dom';
import { Eye, FlaskConical, Scale } from 'lucide-react';
import SectionHeading from '../../components/ui/SectionHeading';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const VALUES = [
  { icon: FlaskConical, title: 'Models first', text: 'Forecasts come from trained models, not hunches. We retrain and evaluate them continuously.' },
  { icon: Eye, title: 'Radical transparency', text: 'Every prediction carries its accuracy metrics so you know how much weight to give it.' },
  { icon: Scale, title: 'Responsible use', text: 'Predictions inform decisions; they never guarantee outcomes. We say so plainly.' },
];

export default function About() {
  useDocumentTitle('About');
  const { siteName, description, tagline, legal } = useSiteConfig();

  return (
    <div className="relative">
      <div className="bg-grid absolute inset-x-0 top-0 -z-10 h-[28rem]" />
      <section className="container-x pt-16 pb-12">
        <SectionHeading
          eyebrow={`About ${siteName}`}
          title={<>Forecasting, <span className="text-gradient">made measurable</span></>}
          subtitle={description || tagline}
        />
      </section>

      <section className="container-x py-12">
        <div className="grid gap-6 md:grid-cols-3">
          {VALUES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="glass-card p-7">
              <Icon className="size-7 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-base-content/70">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x py-12">
        <div className="glass-card grid gap-8 p-8 md:grid-cols-2 md:p-12">
          <div>
            <h2 className="text-2xl font-bold">What we build</h2>
            <p className="mt-4 text-base-content/70">
              {siteName} combines deep-learning stock models with statistical sports analysis behind one subscription. Our stock
              engine uses LSTM networks trained on historical closing prices; our sports engine weighs recent form, head-to-head
              history and team statistics.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Important</h2>
            <p className="mt-4 text-base-content/70">{legal.disclaimer}</p>
            <Link to="/contact" className="btn btn-outline mt-6 border-base-content/20">Talk to us</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
