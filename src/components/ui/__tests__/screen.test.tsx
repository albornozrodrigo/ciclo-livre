import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Screen } from '../screen';

jest.mock('expo-router', () => ({ useIsFocused: () => true }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };

async function renderScreen() {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <Screen screen="analise" territory="lilac" />
    </SafeAreaProvider>,
  );
}

const scrollTo = (y: number) =>
  fireEvent.scroll(screen.getByTestId('screen-scroll'), {
    nativeEvent: { contentOffset: { x: 0, y }, contentSize: { width: 390, height: 3000 }, layoutMeasurement: { width: 390, height: 844 } },
  });

describe('Screen', () => {
  it('no topo, o lobo fica sob a barra de status (sem véu)', async () => {
    await renderScreen();
    expect(screen.queryByTestId('status-scrim', { includeHiddenElements: true })).toBeNull();
  });

  it('depois de rolar além do lobo, um véu da cor da água protege a barra de status', async () => {
    await renderScreen();
    await scrollTo(600);
    expect(screen.getByTestId('status-scrim', { includeHiddenElements: true })).toBeTruthy();
    await scrollTo(0);
    expect(screen.queryByTestId('status-scrim', { includeHiddenElements: true })).toBeNull();
  });
});
