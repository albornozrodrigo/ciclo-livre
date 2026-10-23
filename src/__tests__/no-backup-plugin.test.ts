// eslint-disable-next-line @typescript-eslint/no-require-imports
const plugin = require('../../plugins/with-no-backup');

const DOMAINS = ['root', 'file', 'database', 'sharedpref', 'external'];

describe('plugin with-no-backup (dados de saúde não vão para backup do Android)', () => {
  it('desliga allowBackup e aponta para as regras próprias', () => {
    const app = {
      $: { 'android:allowBackup': 'true', 'android:fullBackupContent': '@xml/secure_store_backup_rules' } as Record<string, string>,
    };
    plugin.applyToApplication(app);
    expect(app.$).toMatchObject({
      'android:allowBackup': 'false',
      'android:fullBackupContent': '@xml/ciclo_livre_no_backup',
      'android:dataExtractionRules': '@xml/ciclo_livre_no_extraction',
    });
  });

  it('Android 11 e anteriores: exclui todos os domínios', () => {
    for (const d of DOMAINS) expect(plugin.FULL_BACKUP_XML).toContain(`<exclude domain="${d}" path="."/>`);
    expect(plugin.FULL_BACKUP_XML).not.toContain('<include');
  });

  it('Android 12+: nada vai para a nuvem nem para a transferência entre aparelhos', () => {
    const xml = plugin.EXTRACTION_XML as string;
    for (const section of ['cloud-backup', 'device-transfer']) {
      const body = xml.split(`<${section}`)[1].split(`</${section}>`)[0];
      for (const d of DOMAINS) expect(body).toContain(`<exclude domain="${d}" path="."/>`);
      expect(body).not.toContain('<include');
    }
  });
});
