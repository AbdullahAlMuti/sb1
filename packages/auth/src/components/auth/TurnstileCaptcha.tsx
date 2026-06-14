import { useEffect } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export function TurnstileCaptcha({ onVerify, onError, onExpire }: TurnstileCaptchaProps) {
  // PRODUCTION REQUIREMENT: set VITE_TURNSTILE_SITE_KEY (build-time). Without it this
  // falls back to Cloudflare's always-pass TEST key — i.e. CAPTCHA is effectively off.
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';
  const isDev = import.meta.env.DEV;

  // Hook is called unconditionally (no rules-of-hooks violation); it only does
  // anything in local dev, where we bypass the real challenge.
  useEffect(() => {
    if (isDev) onVerify('dev-token-bypass');
  }, [isDev, onVerify]);

  if (isDev) return null;

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
