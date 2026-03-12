import { useLocalSearchParams } from 'expo-router';
import { QuestDetailScreen } from '@dopamode/ui';

export default function QuestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <QuestDetailScreen questId={Number(id)} />;
}
