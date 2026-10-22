import { Stack } from 'expo-router';

import { OnboardingDraftProvider } from '@/onboarding/draft';

export default function OnboardingLayout() {
  return (
    <OnboardingDraftProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </OnboardingDraftProvider>
  );
}
