import { useId } from 'react';

export default function FormField({ label, error, hint, icon: Icon, className = '', as = 'input', ...props }) {
  const id = useId();
  const Control = as;
  const isTextarea = as === 'textarea';
  return (
    <fieldset className={`fieldset ${className}`}>
      {label && <label htmlFor={id} className="fieldset-legend text-sm">{label}</label>}
      {isTextarea ? (
        <textarea
          id={id}
          className={`textarea w-full ${error ? 'textarea-error' : ''}`}
          aria-invalid={Boolean(error)}
          {...props}
        />
      ) : (
        <label className={`input w-full ${error ? 'input-error' : ''}`}>
          {Icon && <Icon className="size-4 opacity-50" />}
          <Control id={id} className="grow" aria-invalid={Boolean(error)} {...props} />
        </label>
      )}
      {error ? <p className="label text-error">{error}</p> : hint ? <p className="label">{hint}</p> : null}
    </fieldset>
  );
}
