/** Categorias que descrevem como a pessoa se sente (não fluxo, coleta, testes, contracepção ou medições). */
const SYMPTOM_CATEGORIES = new Set([
  'pain',
  'pms',
  'discharge',
  'energy',
  'sleep_quality',
  'digestion',
  'cravings',
  'skin',
  'hair',
  'feelings',
  'mind',
  'stress',
  'hot_flashes',
  'ailments',
  'clots',
  'mouth',
  'breasts',
  'swelling',
  'lochia',
  'lactation',
]);
/** Estados neutros ou bons: aparecem no registro, mas não são sintomas. */
const NOT_SYMPTOMS = new Set([
  'discharge:none',
  'discharge:sticky',
  'discharge:creamy',
  'discharge:egg_white',
  'discharge:watery',
  'energy:good',
  'energy:high',
  'sleep_quality:ok',
  'sleep_quality:restful',
  'skin:good',
  'hair:good',
  'feelings:happy',
  'feelings:calm',
  'mind:focused',
  'mind:motivated',
  'mind:creative',
  'stress:low',
  'lochia:none',
]);

/** O que conta como sintoma (Análise e "Pode aparecer hoje"): estados neutros e o que não é sintoma ficam de fora. */
export function isSymptom(category: string, option: string): boolean {
  return SYMPTOM_CATEGORIES.has(category) && !NOT_SYMPTOMS.has(`${category}:${option}`);
}
