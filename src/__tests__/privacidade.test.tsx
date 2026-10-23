import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import PrivacidadeScreen from '@/app/privacidade';
import { PRIVACY_POLICY } from '@/content/privacy-policy';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };

describe('Política de privacidade', () => {
  it('mostra título, vigência e as seções com hierarquia de leitura', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <PrivacidadeScreen />
      </SafeAreaProvider>,
    );
    expect(screen.getByRole('header', { name: PRIVACY_POLICY.title })).toBeOnTheScreen();
    expect(screen.getByText(new RegExp(PRIVACY_POLICY.effective))).toBeOnTheScreen();
    const sections = PRIVACY_POLICY.blocks.filter((b) => b.kind === 'h');
    for (const s of sections) expect(screen.getByRole('header', { name: s.kind === 'h' ? s.text : '' })).toBeOnTheScreen();
    expect(screen.getByText('Texto sem revisão jurídica.')).toBeOnTheScreen();
  });
});
