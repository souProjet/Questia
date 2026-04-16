import { useLocalSearchParams } from 'expo-router';
import { QuestDetailScreen } from '@questia/ui';

import { API_BASE_URL } from '../../lib/api';

export default function QuestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <QuestDetailScreen questId={Number(id)} apiBaseUrl={API_BASE_URL} />;
}
