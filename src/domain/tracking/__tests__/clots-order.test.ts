import { defaultVisibleCategories } from '@/domain/tracking/catalog';
import { orderCategories } from '@/domain/tracking/rules';

it('categoria nova entra no registro de quem já personalizou antes da v0.2', () => {
  const before = defaultVisibleCategories('period', null)
    .map((c) => c.id)
    .filter((id) => !['clots', 'mouth', 'breasts', 'swelling', 'self_care'].includes(id));
  const prefs = before.map((category, position) => ({ category, position, hidden: false }));

  const order = orderCategories(defaultVisibleCategories('period', null).map((c) => c.id), prefs);

  expect(order.indexOf('clots')).toBe(order.indexOf('tests') + 1);
});
