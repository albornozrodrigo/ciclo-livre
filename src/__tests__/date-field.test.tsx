import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { DateField } from '@/components/ui/date-field';

jest.mock('@react-native-community/datetimepicker', () => ({ DateTimePickerAndroid: { open: jest.fn() } }));

describe('DateField', () => {
  it('abre o seletor nativo sem exigir tema Material Components (evita crash com AppCompat)', async () => {
    await render(
      <DateField
        label="Data"
        value={null}
        placeholder="Escolher"
        min="2026-01-01"
        max="2026-12-31"
        initial="2026-06-01"
        onChange={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByRole('button'));

    const args = (DateTimePickerAndroid.open as jest.Mock).mock.calls[0][0];
    expect(args.design).not.toBe('material');
    expect(args.mode).toBe('date');
  });

  it('devolve a data confirmada como ISO local', async () => {
    const onChange = jest.fn();
    await render(
      <DateField
        label="Data"
        value={null}
        placeholder="Escolher"
        min="2026-01-01"
        max="2026-12-31"
        initial="2026-06-01"
        onChange={onChange}
      />,
    );
    await fireEvent.press(screen.getByRole('button'));
    const { onValueChange, onChange: deprecated } = (DateTimePickerAndroid.open as jest.Mock).mock.calls.at(-1)[0];

    onValueChange({ type: 'set' }, new Date(2026, 4, 9, 10));

    expect(deprecated).toBeUndefined();

    expect(onChange.mock.calls).toEqual([['2026-05-09']]);
  });
});
