'use client';

import Script from 'next/script';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  getTurnstileSiteKey,
  type TurnstileAuthAction,
} from '@/lib/auth/turnstile-public';

const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          action?: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export type TurnstileWidgetHandle = {
  reset: () => void;
};

interface TurnstileWidgetProps {
  action: TurnstileAuthAction;
  onTokenChange: (token: string | null) => void;
  onWidgetError?: (message: string | null) => void;
}

export const TurnstileWidget = forwardRef<
  TurnstileWidgetHandle,
  TurnstileWidgetProps
>(function TurnstileWidget({ action, onTokenChange, onWidgetError }, ref) {
  const siteKey = getTurnstileSiteKey();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenChangeRef = useRef(onTokenChange);
  const onWidgetErrorRef = useRef(onWidgetError);

  onTokenChangeRef.current = onTokenChange;
  onWidgetErrorRef.current = onWidgetError;

  function clearWidget() {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    }
  }

  function reportError(message: string) {
    onWidgetErrorRef.current?.(message);
    onTokenChangeRef.current(null);
  }

  const renderWidget = useCallback(() => {
    if (
      !siteKey ||
      !containerRef.current ||
      widgetIdRef.current ||
      !window.turnstile
    ) {
      return;
    }

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        theme: 'light',
        callback: (token) => {
          onWidgetErrorRef.current?.(null);
          onTokenChangeRef.current(token);
        },
        'expired-callback': () => onTokenChangeRef.current(null),
        'error-callback': () => {
          reportError(
            'Security check failed. Confirm localhost is listed under your Turnstile widget domains in Cloudflare.',
          );
        },
      });
    } catch {
      reportError(
        'Security check failed. Confirm localhost is listed under your Turnstile widget domains in Cloudflare.',
      );
    }
  }, [action, siteKey]);

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
        onTokenChangeRef.current(null);
      },
    }),
    [],
  );

  useEffect(() => {
    if (!siteKey) {
      return;
    }

    const loadTimer = window.setTimeout(() => {
      if (!widgetIdRef.current) {
        reportError(
          'Security check is still loading. Restart the dev server after CSP changes, and confirm localhost is in your Turnstile widget domains.',
        );
      }
    }, 10_000);

    return () => {
      window.clearTimeout(loadTimer);
      clearWidget();
    };
  }, [action, siteKey]);

  useEffect(() => {
    renderWidget();
  }, [renderWidget]);

  if (!siteKey) {
    return null;
  }

  return (
    <>
      <Script
        src={TURNSTILE_SCRIPT_SRC}
        strategy="afterInteractive"
        onReady={renderWidget}
        onError={() => {
          onWidgetErrorRef.current?.(
            'Could not load Cloudflare Turnstile. Check your network or ad blocker, then refresh.',
          );
        }}
      />
      <div ref={containerRef} className="flex min-h-[65px] justify-center py-1" />
    </>
  );
});
