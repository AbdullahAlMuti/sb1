import React, { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface OtpInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function OtpInput({ value, onChange, disabled = false }: OtpInputProps) {
  const codeRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleCodeChange = (index: number, inputValue: string) => {
    const cleanedValue = inputValue.replace(/[^0-9]/g, '');
    if (!cleanedValue && inputValue !== '') return;

    const newCode = [...value];
    newCode[index] = cleanedValue.slice(-1);
    onChange(newCode);

    if (cleanedValue && index < 5) {
      codeRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      codeRefs[index - 1].current?.focus();
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {value.map((digit, idx) => (
        <div key={idx} className="flex items-center">
          <Input
            ref={codeRefs[idx]}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleCodeChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            disabled={disabled}
            className="w-11 h-12 text-center text-lg font-bold rounded-xl border border-border/80 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-background"
          />
          {idx === 2 && <span className="mx-2 text-muted-foreground font-semibold">-</span>}
        </div>
      ))}
    </div>
  );
}
