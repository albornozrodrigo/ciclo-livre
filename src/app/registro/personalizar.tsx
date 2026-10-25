import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { useSnackbar } from '@/components/ui/snackbar';
import { getCategoryPrefs, saveCategoryPrefs } from '@/db/log-repo';
import { defaultVisibleCategories } from '@/domain/tracking/catalog';
import { orderForEditing } from '@/domain/tracking/rules';
import { ptBR } from '@/i18n/pt-BR';
import { categoryLabels } from '@/i18n/pt-BR-tracking';
import { log } from '@/lib/logger';
import { useProfile } from '@/profile/profile-context';

const copy = ptBR.tracking.customizeScreen;

type Item = { id: string; hidden: boolean };

function move(items: Item[], index: number, delta: -1 | 1): Item[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Mostrar/esconder e reordenar categorias do registro, com botões (sem depender de arrastar). */
export default function PersonalizarScreen() {
  const db = useSQLiteContext();
  const { state } = useProfile();
  const { show } = useSnackbar();
  const profile = state.status === 'ready' ? state.profile : null;
  const [items, setItems] = useState<Item[] | null>(null);
  const defaults = profile ? defaultVisibleCategories(profile.mode, profile.birthControl).map((c) => c.id) : [];
  const defaultsKey = defaults.join(',');

  useEffect(() => {
    let active = true;
    const visible = defaultsKey ? defaultsKey.split(',') : [];
    getCategoryPrefs(db).then(
      (prefs) => {
        if (!active) return;
        setItems(orderForEditing(visible, prefs));
      },
      (error: unknown) => log.error('category_prefs_load_failed', error),
    );
    return () => {
      active = false;
    };
  }, [db, defaultsKey]);

  if (!items) return null;

  async function handleSave() {
    if (!items) return;
    try {
      await saveCategoryPrefs(
        db,
        items.map((item, position) => ({ category: item.id, position, hidden: item.hidden })),
      );
      show(copy.saved);
      if (router.canGoBack()) router.back();
    } catch (error) {
      log.error('category_prefs_save_failed', error);
      show(copy.saveFailed);
    }
  }

  return (
    <FormScreen title={copy.title} hint={copy.hint} actionLabel={copy.save} onAction={handleSave}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setItems(defaults.map((id) => ({ id, hidden: false })))}
        className="min-h-12 justify-center self-start rounded-full border-[1.5px] border-ink px-5 active:opacity-70 dark:border-ink-night">
        <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{copy.reset}</Text>
      </Pressable>
      <View>
        {items.map((item, index) => {
          const label = categoryLabels(item.id).label;
          return (
            <View key={item.id} className="min-h-16 flex-row items-center gap-2 border-b border-line py-2 dark:border-line-night">
              <Switch
                accessibilityLabel={copy.show(label)}
                value={!item.hidden}
                onValueChange={(visible) => setItems(items.map((it) => (it.id === item.id ? { ...it, hidden: !visible } : it)))}
              />
              <Text
                className={
                  item.hidden
                    ? 'flex-1 text-base text-ink-muted dark:text-ink-muted-night'
                    : 'flex-1 text-base font-bold text-ink dark:text-ink-night'
                }>
                {label}
              </Text>
              <MoveButton label={copy.moveUp(label)} symbol="↑" disabled={index === 0} onPress={() => setItems(move(items, index, -1))} />
              <MoveButton
                label={copy.moveDown(label)}
                symbol="↓"
                disabled={index === items.length - 1}
                onPress={() => setItems(move(items, index, 1))}
              />
            </View>
          );
        })}
      </View>
    </FormScreen>
  );
}

function MoveButton({ label, symbol, disabled, onPress }: { label: string; symbol: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-ink active:opacity-70 disabled:opacity-30 dark:border-ink-night">
      <Text className="text-lg font-bold text-ink dark:text-ink-night">{symbol}</Text>
    </Pressable>
  );
}
