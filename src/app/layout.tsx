import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { SwRegister } from '@/components/sw-register'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Slevin — Tournament OS',
  description: 'Private live poker tournament management platform',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SwRegister />
        {children}
      </body>
    </html>
  )
}
