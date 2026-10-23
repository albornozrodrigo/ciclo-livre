/**
 * Dados de saúde não saem do aparelho pelo backup do Android (Google One) nem pela transferência
 * entre aparelhos. O banco é cifrado, mas a agenda de notificações e outras preferências ficam em
 * texto puro; o único caminho de cópia é o backup criptografado que a pessoa gera no app.
 * O plugin do expo-secure-store fica com configureAndroidBackup: false para não sobrescrever isto.
 */
const fs = require('fs');
const path = require('path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const DOMAINS = ['root', 'file', 'database', 'sharedpref', 'external'];
const excludes = (indent) => DOMAINS.map((d) => `${indent}<exclude domain="${d}" path="."/>`).join('\n');

const FULL_BACKUP_XML = `<?xml version="1.0" encoding="utf-8"?>
<!-- Android 11 e anteriores: nada do Ciclo Livre entra no backup. -->
<full-backup-content>
${excludes('  ')}
</full-backup-content>
`;

const EXTRACTION_XML = `<?xml version="1.0" encoding="utf-8"?>
<!-- Android 12+: nada vai para a nuvem nem para outro aparelho. -->
<data-extraction-rules>
  <cloud-backup>
${excludes('    ')}
  </cloud-backup>
  <device-transfer>
${excludes('    ')}
  </device-transfer>
</data-extraction-rules>
`;

const FULL_BACKUP_NAME = 'ciclo_livre_no_backup';
const EXTRACTION_NAME = 'ciclo_livre_no_extraction';

function applyToApplication(app) {
  app.$['android:allowBackup'] = 'false';
  app.$['android:fullBackupContent'] = `@xml/${FULL_BACKUP_NAME}`;
  app.$['android:dataExtractionRules'] = `@xml/${EXTRACTION_NAME}`;
  return app;
}

function withNoBackup(config) {
  config = withAndroidManifest(config, (c) => {
    applyToApplication(AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults));
    return c;
  });
  return withDangerousMod(config, [
    'android',
    async (c) => {
      const dir = path.join(c.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(path.join(dir, `${FULL_BACKUP_NAME}.xml`), FULL_BACKUP_XML);
      await fs.promises.writeFile(path.join(dir, `${EXTRACTION_NAME}.xml`), EXTRACTION_XML);
      return c;
    },
  ]);
}

module.exports = withNoBackup;
module.exports.applyToApplication = applyToApplication;
module.exports.FULL_BACKUP_XML = FULL_BACKUP_XML;
module.exports.EXTRACTION_XML = EXTRACTION_XML;
