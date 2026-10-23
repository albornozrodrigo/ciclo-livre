/** Ícones do app (o primeiro é o padrão). Os mesmos nomes do plugin plugins/with-alternate-icons.js. */
export const APP_ICONS = ['padrao', 'noite', 'sol', 'discreto'] as const;
export type AppIcon = (typeof APP_ICONS)[number];
export const isAppIcon = (v: unknown): v is AppIcon => typeof v === 'string' && (APP_ICONS as readonly string[]).includes(v);
