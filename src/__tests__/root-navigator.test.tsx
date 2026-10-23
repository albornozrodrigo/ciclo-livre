import { Text } from 'react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { RootNavigator } from '@/navigation/root-navigator';

const routes = (onboarded: boolean) => ({
  _layout: () => <RootNavigator onboarded={onboarded} />,
  '(tabs)/_layout': () => {
    const { Slot } = jest.requireActual('expo-router');
    return <Slot />;
  },
  '(tabs)/index': () => <Text>tela hoje</Text>,
  '(tabs)/mais': () => <Text>tela mais</Text>,
  'onboarding/_layout': () => {
    const { Slot } = jest.requireActual('expo-router');
    return <Slot />;
  },
  'onboarding/index': () => <Text>boas-vindas</Text>,
  'perfil/_layout': () => {
    const { Slot } = jest.requireActual('expo-router');
    return <Slot />;
  },
  'perfil/modo': () => <Text>trocar modo</Text>,
  'privacidade/_layout': () => {
    const { Slot } = jest.requireActual('expo-router');
    return <Slot />;
  },
  'privacidade/index': () => <Text>política</Text>,
});

describe('RootNavigator', () => {
  it('sem perfil abre o onboarding', async () => {
    const router = await renderRouter(routes(false));

    expect(screen.getByText('boas-vindas')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/onboarding');
  });

  it('sem perfil, um deep link para uma aba cai no onboarding', async () => {
    await renderRouter(routes(false), { initialUrl: '/mais' });

    expect(screen.getByText('boas-vindas')).toBeOnTheScreen();
  });

  it('com perfil abre as abas', async () => {
    await renderRouter(routes(true));

    expect(screen.getByText('tela hoje')).toBeOnTheScreen();
  });

  it('com perfil, um deep link para o onboarding cai nas abas', async () => {
    await renderRouter(routes(true), { initialUrl: '/onboarding' });

    expect(screen.queryByText('boas-vindas')).toBeNull();
  });

  it('sem perfil, a edição de perfil não é acessível', async () => {
    await renderRouter(routes(false), { initialUrl: '/perfil/modo' });

    expect(screen.queryByText('trocar modo')).toBeNull();
  });

  it('com perfil, a edição de perfil abre', async () => {
    await renderRouter(routes(true), { initialUrl: '/perfil/modo' });

    expect(screen.getByText('trocar modo')).toBeOnTheScreen();
  });

  it.each([true, false])('a política de privacidade abre com ou sem perfil (perfil: %s)', async (onboarded) => {
    await renderRouter(routes(onboarded), { initialUrl: '/privacidade' });

    expect(screen.getByText('política')).toBeOnTheScreen();
  });
});
