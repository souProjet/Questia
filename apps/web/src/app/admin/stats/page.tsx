import type { Metadata } from 'next';
import AdminStatsPageClient from '../AdminStatsPageClient';

export const metadata: Metadata = {
  title: 'Statistiques',
  description: 'Vue globale et graphiques — console admin Questia.',
};

export default function AdminStatsPage() {
  return <AdminStatsPageClient />;
}
