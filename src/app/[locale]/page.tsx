import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export default function HomePage() {
  const t = useTranslations('Home')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">{t('title')}</h1>
      <p className="text-lg text-gray-500">{t('description')}</p>
      <nav className="flex gap-4">
        <Link href="/" locale="en" className="text-blue-500 hover:underline">
          English
        </Link>
        <Link href="/" locale="zh" className="text-blue-500 hover:underline">
          中文
        </Link>
        <Link href="/" locale="tw" className="text-blue-500 hover:underline">
          繁體中文
        </Link>
      </nav>
    </main>
  )
}
