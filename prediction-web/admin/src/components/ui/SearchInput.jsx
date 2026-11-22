import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

export default function SearchInput({ value = '', onChange, placeholder = 'Search…', className = '' }) {
  const [text, setText] = useState(value);
  const debounced = useDebounce(text);
  useEffect(() => { if (debounced !== value) onChange(debounced); }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setText(value); }, [value]);
  return (
    <label className={`input input-sm w-full sm:w-72 ${className}`}>
      <Search className="size-4 opacity-50" />
      <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}
