/** Faixa da categoria Sono para uma duração em minutos (usada pelo Clue e pelo Health Connect). */
export function sleepBucket(minutes: number): 'under_3h' | '3_6h' | '6_9h' | 'over_9h' {
  if (minutes < 180) return 'under_3h';
  if (minutes < 360) return '3_6h';
  if (minutes <= 540) return '6_9h';
  return 'over_9h';
}
