import { useLocalSearchParams } from 'expo-router';
import { QuestDetailScreen } from '@questia/ui';

export default function QuestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <QuestDetailScreen questId={Number(id)} />;
}
