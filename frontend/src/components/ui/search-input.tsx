'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function SearchInput({
  value: controlledValue,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(controlledValue ?? '');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (controlledValue !== undefined) {
      setLocalValue(controlledValue);
    }
  }, [controlledValue]);

  const handleChange = useCallback(
    (val: string) => {
      setLocalValue(val);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChange(val), debounceMs);
    },
    [onChange, debounceMs],
  );

  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] pl-10 pr-9 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-all focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]"
      />
      {localValue && (
        <button
          onClick={() => handleChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
