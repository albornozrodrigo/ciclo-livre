import { act, render } from '@testing-library/react-native';

import { LaunchIntentBridge } from '@/navigation/launch-intent-bridge';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (href: unknown) => mockPush(href) } }));
let mockAction: string | null = null;
let mockListener: ((action: string | null) => void) | null = null;
jest.mock('../../../modules/launch-intent', () => ({
  consumeLaunchAction: () => mockAction,
  addIntentListener: (l: (action: string | null) => void) => {
    mockListener = l;
    return { remove: jest.fn() };
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAction = null;
  mockListener = null;
});

describe('LaunchIntentBridge', () => {
  it.each(['androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE', 'android.intent.action.VIEW_PERMISSION_USAGE'])(
    'aberto pelo Health Connect (%s): mostra a política de privacidade',
    async (action) => {
      mockAction = action;
      await render(<LaunchIntentBridge />);
      expect(mockPush).toHaveBeenCalledWith('/privacidade');
    },
  );

  it('aberto pelo ícone: não navega', async () => {
    mockAction = 'android.intent.action.MAIN';
    await render(<LaunchIntentBridge />);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('já aberto, recebe o intent do Health Connect: mostra a política', async () => {
    await render(<LaunchIntentBridge />);
    await act(async () => mockListener?.('androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE'));
    expect(mockPush).toHaveBeenCalledWith('/privacidade');
  });
});
