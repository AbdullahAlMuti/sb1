import { useEffect } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export function TurnstileCaptcha({ onVerify, onError, onExpire }: TurnstileCaptchaProps) {
  // Only render captcha if VITE_TURNSTILE_SITE_KEY is explicitly configured.
  // Otherwise, automatically bypass it to prevent showing the "for testing only" widget.
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (isDev || !siteKey) {
      onVerify(isDev ? 'dev-token-bypass' : 'no-captcha-bypass');
    }
  }, [isDev, siteKey, onVerify]);

  if (isDev || !siteKey) return null;

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
