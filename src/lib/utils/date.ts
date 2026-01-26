/**
 * Utilitaires de date avec timezone Europe/Paris pour CoProFlex
 */

import {
  format,
  formatDistanceToNow,
  isAfter,
  isBefore,
  isToday,
  differenceInDays,
  differenceInMonths,
  parseISO,
  startOfDay,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz'
import { APP_CONFIG } from '@/lib/constants/app'

const TIMEZONE = APP_CONFIG.TIMEZONE // 'Europe/Paris'
const LOCALE = { locale: fr }

/**
 * Obtenir la date/heure actuelle en timezone Paris
 */
export function now(): Date {
  return toZonedTime(new Date(), TIMEZONE)
}

/**
 * Obtenir aujourd'hui à minuit (début de journée) en timezone Paris
 */
export function today(): Date {
  return startOfDay(now())
}

/**
 * Convertir une date UTC vers timezone Paris
 */
export function toParisTime(date: Date | string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date
  return toZonedTime(d, TIMEZONE)
}

/**
 * Convertir une date Paris vers UTC (pour stockage Supabase)
 */
export function toUTC(date: Date): Date {
  return fromZonedTime(date, TIMEZONE)
}

/**
 * Formater une date en français
 */
export function formatDate(
  date: Date | string | null | undefined,
  formatStr: keyof typeof APP_CONFIG.DATE_FORMAT | string = 'short'
): string {
  if (!date) return '-'

  const d = typeof date === 'string' ? parseISO(date) : date
  const parisDate = toZonedTime(d, TIMEZONE)

  const formatPattern = APP_CONFIG.DATE_FORMAT[formatStr as keyof typeof APP_CONFIG.DATE_FORMAT] || formatStr

  return format(parisDate, formatPattern, LOCALE)
}

/**
 * Formater avec timezone explicite (pour debug ou affichage technique)
 */
export function formatDateTZ(date: Date | string, formatStr: string = 'dd/MM/yyyy HH:mm zzz'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatInTimeZone(d, TIMEZONE, formatStr, LOCALE)
}

/**
 * "Il y a X jours" / "Dans X jours" en français
 */
export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(toZonedTime(d, TIMEZONE), {
    addSuffix: true,
    ...LOCALE
  })
}

/**
 * Vérifier si une date est dans le futur (timezone Paris)
 */
export function isDateFuture(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isAfter(toZonedTime(d, TIMEZONE), now())
}

/**
 * Vérifier si une date est dans le passé (timezone Paris)
 */
export function isDatePast(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isBefore(toZonedTime(d, TIMEZONE), now())
}

/**
 * Vérifier si une date est aujourd'hui (timezone Paris)
 */
export function isDateToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isToday(toZonedTime(d, TIMEZONE))
}

/**
 * Différence en jours (timezone Paris)
 */
export function daysDiff(date: Date | string): number {
  const d = typeof date === 'string' ? parseISO(date) : date
  return differenceInDays(toZonedTime(d, TIMEZONE), today())
}

/**
 * Différence en mois (timezone Paris)
 */
export function monthsDiff(date: Date | string): number {
  const d = typeof date === 'string' ? parseISO(date) : date
  return differenceInMonths(toZonedTime(d, TIMEZONE), now())
}

/**
 * Créer une date en timezone Paris
 * Utile pour les formulaires où l'utilisateur saisit une date/heure locale
 */
export function createParisDate(
  year: number,
  month: number,    // 1-12
  day: number,
  hour: number = 0,
  minute: number = 0
): Date {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
  return fromZonedTime(parseISO(dateStr), TIMEZONE)
}

/**
 * Parser une date string et retourner en timezone Paris
 */
export function parseDate(dateStr: string): Date {
  return toZonedTime(parseISO(dateStr), TIMEZONE)
}
