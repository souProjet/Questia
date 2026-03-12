import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dopamode',
  description: 'Tu t\'ennuies parce que t\'as pas de quêtes secondaires. La vie c\'est pas juste travailler + dormir.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  );
}
