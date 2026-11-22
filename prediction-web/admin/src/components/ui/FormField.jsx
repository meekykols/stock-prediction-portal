import { useId } from 'react';

export default function FormField({ label, error, hint, as = 'input', className = '', children, ...props }) {
  const id = useId();
  let control;
  if (as === 'textarea') control = <textarea id={id} className={`textarea w-full ${error ? 'textarea-error' : ''}`} aria-invalid={Boolean(error)} {...props} />;
  else if (as === 'select') control = <select id={id} className={`select w-full ${error ? 'select-error' : ''}`} aria-invalid={Boolean(error)} {...props}>{children}</select>;
  else control = <input id={id} className={`input w-full ${error ? 'input-error' : ''}`} aria-invalid={Boolean(error)} {...props} />;
  return (
    <fieldset className={`fieldset ${className}`}>
      {label && <label htmlFor={id} className="fieldset-legend text-sm">{label}</label>}
      {control}
      {error ? <p className="label text-error">{error}</p> : hint ? <p className="label whitespace-normal">{hint}</p> : null}
    </fieldset>
  );
}
