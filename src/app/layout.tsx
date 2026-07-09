import type { Metadata } from 'next'
import { routing } from '@/i18n/routing'
import './[locale]/globals.css'

export const metadata: Metadata = {
  title: 'i18n Starter',
  description: 'A minimal Next.js starter with i18n support',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang={routing.defaultLocale} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
