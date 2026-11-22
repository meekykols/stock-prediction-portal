import { useSiteConfig } from '../../hooks/useSiteConfig';

export default function Faq() {
  const { siteName, contact } = useSiteConfig();
  const items = [
    {
      q: `How does ${siteName} make market predictions?`,
      a: 'A Long Short-Term Memory (LSTM) neural network is trained on years of daily closing prices. For each stock, currency pair, commodity or coin you request, it forecasts prices and reports how closely the model tracked real prices (R², RMSE and MSE), so you can judge reliability yourself.',
    },
    {
      q: 'Which sports are covered?',
      a: 'Football is first, with fixtures, form, head-to-head and team statistics feeding the models. More sports will follow.',
    },
    {
      q: 'Can I cancel any time?',
      a: 'Yes. Paid plans renew automatically and can be cancelled from your billing page. You keep access until the end of the period you paid for.',
    },
    {
      q: 'How are payments handled?',
      a: 'Payments are processed by Paystack. We never see or store your full card details.',
    },
    {
      q: 'Is this financial or betting advice?',
      a: 'No. Predictions are statistical estimates. Markets and matches are uncertain, so never stake more than you can afford to lose.',
    },
    {
      q: 'How do I get support?',
      a: contact.supportEmail || contact.email
        ? `Email ${contact.supportEmail || contact.email}${contact.supportHours ? ` (${contact.supportHours})` : ''}, or use the contact form. Pro and Elite members also get live chat.`
        : 'Use the contact form and our team will get back to you. Pro and Elite members also get live chat.',
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {items.map((item, i) => (
        <div key={item.q} className="collapse collapse-plus glass-card">
          <input type="radio" name="faq" defaultChecked={i === 0} aria-label={item.q} />
          <div className="collapse-title font-medium">{item.q}</div>
          <div className="collapse-content text-sm text-base-content/70"><p>{item.a}</p></div>
        </div>
      ))}
    </div>
  );
}
