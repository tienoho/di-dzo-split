import React, { useEffect, useRef, useState } from 'react';
import { formatCurrencyNumber, parseCurrencyInput } from '../../utils/currency';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (val: number) => void;
  suffix?: string;
  allowZero?: boolean;
}

export default function MoneyInput({
  value,
  onChange,
  className = '',
  placeholder = '0',
  suffix = 'đ',
  allowZero = false,
  readOnly = false,
  ...props
}: MoneyInputProps) {
  const editingRef = useRef(false);
  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (value === 0) return allowZero ? '0' : '';
    return formatCurrencyNumber(value);
  });

  useEffect(() => {
    if (editingRef.current) return;
    if (value === 0) {
      setDisplayValue(allowZero ? '0' : '');
    } else {
      setDisplayValue(formatCurrencyNumber(value));
    }
  }, [value, allowZero]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Keep punctuation while focused so users can finish typing "1,5tr".
    setDisplayValue(raw);
    onChange(parseCurrencyInput(raw));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    editingRef.current = false;
    const parsed = parseCurrencyInput(e.target.value);
    onChange(parsed);
    setDisplayValue(parsed > 0 ? formatCurrencyNumber(parsed) : (allowZero ? '0' : ''));
    if (props.onBlur) props.onBlur(e);
  };

  return (
    <div className="relative w-full">
      <input
        {...props}
        onFocus={(event) => { editingRef.current = true; props.onFocus?.(event); }}
        type="text"
        inputMode="numeric"
        readOnly={readOnly}
        value={displayValue}
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={handleBlur}
        className={className}
      />
      {suffix && (
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 pointer-events-none select-none">
          {suffix}
        </span>
      )}
    </div>
  );
}
