import React, { useState } from 'react';
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export function TurnstileCaptcha({ onVerify, onError, onExpire }: TurnstileCaptchaProps) {
  // Using a dummy site key for development. In production, this should be an environment variable.
  // The user will need to replace this with their actual Cloudflare Turnstile Site Key.
  // E.g., import.meta.env.VITE_TURNSTILE_SITE_KEY
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'; // 1x0... is a testing key that always passes

  // Bypass Turnstile entirely in local dev environment
  if (import.meta.env.DEV) {
    React.useEffect(() => {
      // Simulate success immediately
      onVerify('dev-token-bypass');
    }, [onVerify]);
    return null;
  }

  return (
    <div className="flex justify-center w-full my-4">
      <Turnstile
        siteKey={siteKey}
        onSuccess={(token) => onVerify(token)}
        onError={() => {
          if (onError) onError();
        }}
        onExpire={() => {
          if (onExpire) onExpire();
        }}
        options={{
          theme: 'auto',
        }}
      />
    </div>
  );
}
