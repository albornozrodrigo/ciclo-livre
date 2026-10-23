import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { APP_ICONS, type AppIcon, isAppIcon } from '@/appearance/icons';
import { getSavedTheme, saveTheme, type Theme, THEMES } from '@/appearance/theme';
import { FormScreen } from '@/components/form-screen';
import { ChoiceList } from '@/components/ui/choice-list';
import { ptBR } from '@/i18n/pt-BR';

import { appIconSupported, getAppIcon, setAppIcon } from '../../../modules/app-icon';

const a = ptBR.appearance;

const PREVIEWS: Record<AppIcon, number> = {
  padrao: require('../../../assets/images/icons/padrao-full.png'),
  noite: require('../../../assets/images/icons/noite-full.png'),
  sol: require('../../../assets/images/icons/sol-full.png'),
  discreto: require('../../../assets/images/icons/discreto-full.png'),
};

const themeOptions = THEMES.map((value) => ({ value, label: a.themes[value] }));

function IconChoice({ icon, selected, onPress }: { icon: AppIcon; selected: boolean; onPress: () => void }) {
  const label = icon === 'discreto' ? `${a.icons.discreto}. ${a.discreetDetail}` : a.icons[icon];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className="w-[47%] items-center gap-2 py-2 active:opacity-70">
      {/* Selecionado: anel de tinta de 3dp em volta da prévia (nunca cor de fase). */}
      <View
        className={`rounded-full p-1 ${selected ? 'border-[3px] border-ink dark:border-ink-night' : 'border-[3px] border-transparent'}`}>
        {/* Filete `line`: a prévia com fundo igual ao da tela (Território no claro, Noite no escuro) não some. */}
        <View className="overflow-hidden rounded-full border-[1.5px] border-line dark:border-line-night">
          <Image source={PREVIEWS[icon]} style={{ width: 72, height: 72 }} accessible={false} />
        </View>
      </View>
      <Text className="text-base font-bold text-ink dark:text-ink-night">{a.icons[icon]}</Text>
    </Pressable>
  );
}

/** Mais → Aparência: tema e ícone, todos liberados. */
export default function AparenciaScreen() {
  const [theme, setTheme] = useState<Theme>(getSavedTheme);
  const initialIcon = getAppIcon();
  const [icon, setIcon] = useState<AppIcon>(isAppIcon(initialIcon) ? initialIcon : 'padrao');
  const [changed, setChanged] = useState(false);

  function chooseTheme(next: Theme) {
    saveTheme(next);
    setTheme(next);
  }

  function chooseIcon(next: AppIcon) {
    setAppIcon(next);
    setIcon(next);
    setChanged(true);
  }

  return (
    <FormScreen title={a.title} hint={a.hint}>
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
          {a.themeTitle}
        </Text>
        <ChoiceList label={a.themeTitle} options={themeOptions} value={theme} onChange={chooseTheme} />
      </View>
      {appIconSupported() ? (
        <View className="gap-3">
          <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
            {a.iconTitle}
          </Text>
          <View accessibilityRole="radiogroup" accessibilityLabel={a.iconTitle} className="flex-row flex-wrap justify-between">
            {APP_ICONS.map((i) => (
              <IconChoice key={i} icon={i} selected={i === icon} onPress={() => chooseIcon(i)} />
            ))}
          </View>
          {changed ? (
            <Text accessibilityLiveRegion="polite" className="text-base leading-6 text-ink-muted dark:text-ink-muted-night">
              {a.iconPending}
            </Text>
          ) : null}
        </View>
      ) : null}
    </FormScreen>
  );
}
