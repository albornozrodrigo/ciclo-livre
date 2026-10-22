import { eraseAllData } from '@/db/erase';

function deps(overrides: { deleteDatabase?: () => Promise<void> } = {}) {
  const calls: string[] = [];
  return {
    calls,
    deps: {
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
  it('fecha a conexão, apaga o arquivo e só então apaga a chave', async () => {
    const { calls, deps: d } = deps();

    await eraseAllData(d);

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
    expect(calls).toEqual(['close']);
  });
});
