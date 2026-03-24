'use client';

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
      onClick={() => {
        queueMicrotask(() => document.getElementById('main-content')?.focus());
      }}
    >
      Aller au contenu principal
    </a>
  );
}
