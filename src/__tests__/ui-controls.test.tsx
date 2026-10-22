import { fireEvent, render, screen } from '@testing-library/react-native';

import { CapsuleButton } from '@/components/ui/capsule-button';
import { ChoiceList } from '@/components/ui/choice-list';
import { NumberStepper } from '@/components/ui/number-stepper';

describe('CapsuleButton', () => {
  it('é um botão com o rótulo como nome acessível e chama onPress', async () => {
    const onPress = jest.fn();
    await render(<CapsuleButton label="Continuar" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('desabilitado não chama onPress e anuncia o estado', async () => {
    const onPress = jest.fn();
    await render(<CapsuleButton label="Continuar" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Continuar' });
    await fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });
});

describe('ChoiceList', () => {
  const options = [
    { value: 'a', label: 'Opção A' },
    { value: 'b', label: 'Opção B', detail: 'Explicação' },
  ];

  it('expõe as opções como rádios com o selecionado marcado', async () => {
    await render(<ChoiceList label="Escolha" options={options} value="b" onChange={jest.fn()} />);

    // O grupo não recebe foco (agruparia os rádios no Android); o papel fica no contêiner rotulado.
    expect(screen.getByLabelText('Escolha')).toHaveProp('accessibilityRole', 'radiogroup');
    expect(screen.getByRole('radio', { name: /Opção B/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Opção A/ })).not.toBeChecked();
  });

  it('tocar numa opção informa o valor', async () => {
    const onChange = jest.fn();
    await render(<ChoiceList label="Escolha" options={options} value={null} onChange={onChange} />);

    await fireEvent.press(screen.getByRole('radio', { name: /Opção A/ }));

    expect(onChange).toHaveBeenCalledWith('a');
  });
});

describe('NumberStepper', () => {
  const renderStepper = (value: number, onChange = jest.fn()) =>
    render(
      <NumberStepper
        label="Duração do ciclo"
        value={value}
        min={15}
        max={90}
        onChange={onChange}
        format={(n) => `${n} dias`}
        decreaseLabel="Diminuir"
        increaseLabel="Aumentar"
      />,
    );

  it('mostra o valor formatado e é ajustável para leitores de tela', async () => {
    await renderStepper(28);

    const stepper = screen.getByRole('adjustable', { name: 'Duração do ciclo' });
    expect(stepper).toHaveAccessibilityValue({ text: '28 dias' });
  });

  it('botões somam e subtraem 1', async () => {
    const onChange = jest.fn();
    await renderStepper(28, onChange);

    await fireEvent.press(screen.getByRole('button', { name: 'Aumentar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Diminuir' }));

    expect(onChange.mock.calls).toEqual([[29], [27]]);
  });

  it('não passa dos limites', async () => {
    const onChange = jest.fn();
    await renderStepper(90, onChange);

    await fireEvent.press(screen.getByRole('button', { name: 'Aumentar' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('responde às ações de incremento do leitor de tela', async () => {
    const onChange = jest.fn();
    await renderStepper(28, onChange);

    await fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });

    expect(onChange).toHaveBeenCalledWith(29);
  });
});
