import Link from 'next/link'

export default function NotFound() {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-lg text-gray-500">Page not found</p>
        <Link href="/" className="text-blue-500 hover:underline">
          Go Home
        </Link>
      </body>
    </html>
  )
}
