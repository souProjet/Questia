'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type LandingRevealProps = {
  children: ReactNode;
  className?: string;
  /** Délai après apparition dans le viewport (ms) */
  delayMs?: number;
};

/**
 * Fait apparaître le contenu au scroll (léger fade + translate).
 * Désactivé si l'utilisateur préfère moins de mouvement.
 */
export function LandingReveal({ children, className = '', delayMs = 0 }: LandingRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    let timeout: ReturnType<typeof setTimeout>;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        obs.unobserve(el);
        if (delayMs > 0) {
          timeout = setTimeout(() => setVisible(true), delayMs);
        } else {
          setVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -24px 0px' }
    );

    obs.observe(el);
    return () => {
      obs.disconnect();
      clearTimeout(timeout);
    };
  }, [delayMs]);

  return (
    <div
      ref={ref}
      className={[
        'transition-[opacity,transform] duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-0',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
