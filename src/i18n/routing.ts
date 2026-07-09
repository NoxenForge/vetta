import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

export const locales = ['en', 'tw', 'zh'] as const
export const defaultLocale = 'en'

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: {
    mode: 'as-needed',
  },
})

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing)

export function isDefaultLocale(locale: string): boolean {
  return locale === defaultLocale
}

export function localePrefix(locale: string): string {
  return isDefaultLocale(locale) ? '' : `/${locale}`
}
