/**
 * Tinge os componentes nativos do Android (diálogos de data e de confirmação) com a tinta do
 * Ciclo Livre, no lugar do teal padrão. Claro: tinta grafite; escuro: tinta clara.
 */
const { AndroidConfig, withAndroidColors, withAndroidColorsNight, withAndroidStyles } = require('expo/config-plugins');

const INK = '#2C2E2A';
const INK_NIGHT = '#F2EEE1';

function setAccent(colors, value) {
  let next = AndroidConfig.Colors.assignColorValue(colors, { name: 'colorPrimary', value });
  next = AndroidConfig.Colors.assignColorValue(next, { name: 'colorAccent', value });
  return next;
}

module.exports = function withAndroidAccent(config) {
  config = withAndroidColors(config, (c) => {
    c.modResults = setAccent(c.modResults, INK);
    return c;
  });
  config = withAndroidColorsNight(config, (c) => {
    c.modResults = setAccent(c.modResults, INK_NIGHT);
    return c;
  });
  return withAndroidStyles(config, (c) => {
    c.modResults = AndroidConfig.Styles.assignStylesValue(c.modResults, {
      add: true,
      parent: AndroidConfig.Styles.getAppThemeGroup(),
      name: 'colorAccent',
      value: '@color/colorAccent',
    });
    return c;
  });
};
