import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quêtes Secondaires',
  description: 'Tu t\'ennuies parce que t\'as pas de quêtes secondaires. La vie c\'est pas juste travailler + dormir.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
