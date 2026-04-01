const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function isDateOnlyString(value: string): boolean {
  return DATE_ONLY_REGEX.test(value);
}

export function toDateOnly(value: unknown): string {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return '';
    }
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    if (isDateOnlyString(trimmed)) {
      return trimmed;
    }

    if (trimmed.length >= 10 && isDateOnlyString(trimmed.slice(0, 10))) {
      return trimmed.slice(0, 10);
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getUTCFullYear()}-${pad(parsed.getUTCMonth() + 1)}-${pad(parsed.getUTCDate())}`;
    }
  }

  return '';
}

export function dateOnlyToUtcDate(value: string): Date {
  const match = value.match(DATE_ONLY_REGEX);
  if (!match) {
    return new Date(NaN);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

export function addMonthsToDateOnly(value: string, months: number): string {
  const base = dateOnlyToUtcDate(value);
  if (Number.isNaN(base.getTime())) {
    return '';
  }

  base.setUTCMonth(base.getUTCMonth() + months);
  return `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(base.getUTCDate())}`;
}

export function compareDateOnly(a: string, b: string): number {
  const aDate = dateOnlyToUtcDate(toDateOnly(a));
  const bDate = dateOnlyToUtcDate(toDateOnly(b));

  const aTime = aDate.getTime();
  const bTime = bDate.getTime();

  if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
    return 0;
  }

  if (aTime < bTime) return -1;
  if (aTime > bTime) return 1;
  return 0;
}

export function formatDateOnly(
  value: unknown,
  locale = 'es-CO',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' },
): string {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) {
    return '';
  }

  const date = dateOnlyToUtcDate(dateOnly);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    ...options,
  }).format(date);
}
