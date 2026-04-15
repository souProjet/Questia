import { useLocalSearchParams } from 'expo-router';
import { QuestDetailScreen } from '@questia/ui';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export default function QuestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <QuestDetailScreen questId={Number(id)} apiBaseUrl={API_BASE_URL} />;
}
