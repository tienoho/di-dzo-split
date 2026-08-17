import React, { useEffect, useState } from 'react';
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
  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (value === 0 && !allowZero) return '';
    return formatCurrencyNumber(value);
  });

  useEffect(() => {
    if (value === 0 && !allowZero) {
      setDisplayValue('');
    } else {
      setDisplayValue(formatCurrencyNumber(value));
    }
  }, [value, allowZero]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const parsed = parseCurrencyInput(raw);
    onChange(parsed);

    // If user is typing suffix shortcut (e.g. 'k', 'm', 'tr'), expand to formatted number
    if (/[kmtr]/i.test(raw)) {
      setDisplayValue(formatCurrencyNumber(parsed));
    } else if (parsed === 0 && !allowZero) {
      setDisplayValue(raw.trim() === '' ? '' : '0');
    } else {
      setDisplayValue(formatCurrencyNumber(parsed));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const parsed = parseCurrencyInput(e.target.value);
    onChange(parsed);
    setDisplayValue(parsed > 0 ? formatCurrencyNumber(parsed) : (allowZero ? '0' : ''));
    if (props.onBlur) props.onBlur(e);
  };

  return (
    <div className="relative w-full">
      <input
        {...props}
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
