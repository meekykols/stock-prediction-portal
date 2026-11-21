import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { billingApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { sessionReceived } from '../../store/authSlice';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const MAX_ATTEMPTS = 6;

/** Paystack redirects here with ?reference=… (and ?trxref=…) after checkout. */
export default function BillingCallback() {
  useDocumentTitle('Confirming payment');
  const [params] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref');
  const dispatch = useDispatch();
  const [state, setState] = useState({ phase: reference ? 'verifying' : 'error', message: reference ? '' : 'Missing payment reference.' });

  useEffect(() => {
    if (!reference) return undefined;
    let cancelled = false;
    let timer;

    const attempt = async (n) => {
      try {
        const data = await billingApi.verify(reference);
        if (cancelled) return;
        const { status } = data.payment;
        if (status === 'success') {
          dispatch(sessionReceived({ user: data.user, subscription: data.subscription }));
          setState({ phase: 'success', plan: data.payment.plan?.name });
        } else if (status === 'pending' && n < MAX_ATTEMPTS) {
          timer = setTimeout(() => attempt(n + 1), 2500);
        } else if (status === 'pending') {
          setState({ phase: 'pending' });
        } else {
          setState({ phase: 'failed', status });
        }
      } catch (err) {
        if (!cancelled) setState({ phase: 'error', message: errorMessage(err) });
      }
    };
    attempt(1);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [reference, dispatch]);

  const views = {
    verifying: {
      icon: <span className="loading loading-ring loading-lg text-primary" />,
      title: 'Confirming your payment…',
      text: 'This only takes a moment. Please keep this page open.',
    },
    success: {
      icon: <CheckCircle2 className="size-14 text-success" />,
      title: `You're on ${state.plan || 'your new plan'}!`,
      text: 'Your new limits are active right away. A receipt is in your payment history.',
      actions: <><Link to="/app" className="btn btn-primary">Go to dashboard</Link><Link to="/app/billing" className="btn btn-ghost">View billing</Link></>,
    },
    pending: {
      icon: <Clock className="size-14 text-warning" />,
      title: 'Payment still processing',
      text: "Your bank hasn't confirmed the payment yet. We'll upgrade your plan automatically as soon as it does.",
      actions: <Link to="/app/billing" className="btn btn-primary">Back to billing</Link>,
    },
    failed: {
      icon: <XCircle className="size-14 text-error" />,
      title: state.status === 'abandoned' ? 'Payment not completed' : 'Payment failed',
      text: 'You have not been charged. You can try again with the same or a different card.',
      actions: <Link to="/app/billing" className="btn btn-primary">Try again</Link>,
    },
    error: {
      icon: <XCircle className="size-14 text-error" />,
      title: "We couldn't confirm this payment",
      text: state.message,
      actions: <Link to="/app/billing" className="btn btn-primary">Back to billing</Link>,
    },
  };
  const view = views[state.phase];

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="glass-card flex max-w-md flex-col items-center gap-4 p-10 text-center">
        {view.icon}
        <h1 className="text-2xl font-bold">{view.title}</h1>
        <p className="text-base-content/70">{view.text}</p>
        {view.actions && <div className="mt-2 flex flex-wrap justify-center gap-2">{view.actions}</div>}
      </div>
    </div>
  );
}
