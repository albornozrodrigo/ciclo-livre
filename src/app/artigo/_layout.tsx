import { Stack } from 'expo-router';

export default function ArticleLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
