import { eraseAllData } from '@/db/erase';

function deps(overrides: { deleteDatabase?: () => Promise<void>; cancelReminders?: () => Promise<void> } = {}) {
  const calls: string[] = [];
  return {
    calls,
    deps: {
      cancelReminders:
        overrides.cancelReminders ??
        (async () => {
          calls.push('cancelReminders');
        }),
      closeDatabase: async () => {
        calls.push('close');
      },
      deleteDatabase:
        overrides.deleteDatabase ??
        (async () => {
          calls.push('deleteDatabase');
        }),
      deleteKey: async () => {
        calls.push('deleteKey');
      },
    },
  };
}

describe('eraseAllData', () => {
  it('cancela os lembretes, fecha a conexão, apaga o arquivo e só então apaga a chave', async () => {
    const { calls, deps: d } = deps();

    await eraseAllData(d);

    expect(calls).toEqual(['cancelReminders', 'close', 'deleteDatabase', 'deleteKey']);
  });

  it('se cancelar os lembretes falha, apaga os dados mesmo assim e depois avisa o erro', async () => {
    const failure = new Error('notificações');
    const { calls, deps: d } = deps({
      cancelReminders: async () => {
        throw failure;
      },
    });

    await expect(eraseAllData(d)).rejects.toBe(failure);
    expect(calls).toEqual(['close', 'deleteDatabase', 'deleteKey']);
  });

  it('mantém a chave e propaga o erro quando apagar o arquivo falha', async () => {
    const failure = new Error('falhou');
    const { calls, deps: d } = deps({
      deleteDatabase: async () => {
        throw failure;
      },
    });

    await expect(eraseAllData(d)).rejects.toBe(failure);
    expect(calls).toEqual(['cancelReminders', 'close']);
  });
});
