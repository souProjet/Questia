'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { analyticsConfig } from '@/config/analytics';
import { readMarketingConsent, type MarketingConsent } from '@/lib/analytics/consent';

declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
  }
}

function MetaPageViewTracker({ consent }: { consent: MarketingConsent | null }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!consent?.ads || !analyticsConfig.metaPixelId) return;
    if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
    window.fbq('track', 'PageView');
  }, [pathname, consent]);

  return null;
}

export function MarketingScripts() {
  const [consent, setConsent] = useState<MarketingConsent | null>(null);

  useEffect(() => {
    setConsent(readMarketingConsent());
    const handler = () => setConsent(readMarketingConsent());
    window.addEventListener('questia-consent-change', handler);
    return () => window.removeEventListener('questia-consent-change', handler);
  }, []);

  const allowGtm = consent && (consent.analytics || consent.ads) && analyticsConfig.gtmId;
  const allowGaDirect =
    consent?.analytics && analyticsConfig.gaMeasurementId && !analyticsConfig.gtmId;
  const allowMeta = consent?.ads && analyticsConfig.metaPixelId;

  return (
    <>
      {allowGtm ? (
        <Script
          id="gtm-loader"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${analyticsConfig.gtmId}');`,
          }}
        />
      ) : null}

      {allowGaDirect ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${analyticsConfig.gaMeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-config" strategy="afterInteractive">
            {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${analyticsConfig.gaMeasurementId}', { anonymize_ip: true });
          `}
          </Script>
        </>
      ) : null}

      {allowMeta ? (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${analyticsConfig.metaPixelId}');
            fbq('track', 'PageView');
          `}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              className="hidden"
              src={`https://www.facebook.com/tr?id=${analyticsConfig.metaPixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      ) : null}

      {allowMeta ? <MetaPageViewTracker consent={consent} /> : null}
    </>
  );
}
