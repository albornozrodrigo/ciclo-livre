import { daysBetween, type IsoDate, monthsBetween } from '@/domain/dates';

/** Menopausa: meses sem menstruar desde o último sangramento antes dela. */
export type MenopauseView = {
  kind: 'menopause';
  /** Ponto de partida da contagem (informado ou registrado); null = não sabemos. */
  since: IsoDate | null;
  months: number;
  years: number;
  /** 12 meses seguidos sem menstruar. */
  confirmed: boolean;
  /** Sangramento registrado depois de 12 meses sem menstruar, nos últimos 180 dias: pede avaliação. */
  bleedingAfter: boolean;
};

/** A menopausa se confirma com 12 meses seguidos sem menstruar. */
const CONFIRM_MONTHS = 12;
/** Por quanto tempo o aviso de sangramento fica em Hoje. */
const WARNING_DAYS = 180;
/** Sangramentos separados por até 7 dias contam como o mesmo episódio. */
const EPISODE_GAP = 7;

type Episode = { start: IsoDate; end: IsoDate };

function episodesOf(dates: readonly IsoDate[]): Episode[] {
  const episodes: Episode[] = [];
  for (const d of dates) {
    const last = episodes.at(-1);
    if (last && daysBetween(last.end, d) <= EPISODE_GAP) last.end = d;
    else episodes.push({ start: d, end: d });
  }
  return episodes;
}

/**
 * Função pura. `bleeds`: dias com menstruação ou escape registrados, em ordem.
 * Sangramentos de antes da última menstruação informada ficam de fora (histórico antigo).
 *
 * Um episódio que começa 12 meses ou mais depois da referência anterior (sangramento ou data informada)
 * é sangramento depois da menopausa: a partir dele, todo sangramento pede avaliação e a contagem
 * continua desde antes dele. Sem referência anterior, o app não sabe dos 12 meses e não afirma nada.
 */
export function menopauseView(finalPeriod: IsoDate | null, bleeds: readonly IsoDate[], today: IsoDate): MenopauseView {
  const episodes = episodesOf(bleeds.filter((d) => d <= today && (finalPeriod === null || d > finalPeriod)));

  let reference: IsoDate | null = finalPeriod;
  let menopauseSince: IsoDate | null = null;
  for (const episode of episodes) {
    if (menopauseSince === null && reference !== null && monthsBetween(reference, episode.start) >= CONFIRM_MONTHS) {
      menopauseSince = reference;
    }
    reference = episode.end;
  }

  const since = menopauseSince ?? reference;
  const months = since ? monthsBetween(since, today) : 0;
  const lastAfter = menopauseSince ? episodes.at(-1)?.end : undefined;
  return {
    kind: 'menopause',
    since,
    months,
    years: Math.floor(months / 12),
    confirmed: months >= CONFIRM_MONTHS,
    bleedingAfter: lastAfter !== undefined && daysBetween(lastAfter, today) <= WARNING_DAYS,
  };
}
