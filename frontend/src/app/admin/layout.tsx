import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import LogoutButton from './LogoutButton'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 gap-4 p-4 sm:p-6 md:grid-cols-[280px_1fr]">

        <details className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 shadow-xl shadow-black/30 md:hidden">
          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-zinc-100">
            Menú admin
            <span>☰</span>
          </summary>
          <div className="mt-4 space-y-2 text-sm text-zinc-300">
            <Link href="/admin/dashboard" className="block rounded-2xl px-4 py-3 hover:bg-zinc-900 hover:text-white">
              Dashboard
            </Link>
            <Link href="/admin/products" className="block rounded-2xl px-4 py-3 hover:bg-zinc-900 hover:text-white">
              Productos
            </Link>
            <Link href="/admin/content" className="block rounded-2xl px-4 py-3 hover:bg-zinc-900 hover:text-white">
              Contenido
            </Link>
            <Link href="/admin/images" className="block rounded-2xl px-4 py-3 hover:bg-zinc-900 hover:text-white">
              Imágenes
            </Link>
            <Link href="/admin/messages" className="block rounded-2xl px-4 py-3 hover:bg-zinc-900 hover:text-white">
              Mensajes
            </Link>
            <Link href="/" target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-sm font-medium text-zinc-100 hover:bg-zinc-900 hover:text-white transition">
              <Image
                src="/img/logoo.webp"
                alt="Tenaski"
                width={500}
                height={500}
                sizes="16px"
                className="h-4 w-4 object-contain"
              />
              Ver Web
            </Link>

            <div className="mt-2 border-t border-zinc-800 pt-2">
              <LogoutButton />
            </div>
          </div>
        </details>

        <aside className="hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-black/30 md:flex md:flex-col md:justify-between">
          <div>
            <div className="p-8 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <Image
                  src="/img/logoo.webp"
                  alt="Tenaski"
                  width={500}
                  height={500}
                  sizes="40px"
                  className="w-10 h-10 object-contain"
                />
                <div>
                  <h1 className="text-lg font-semibold tracking-wide">TENASKI</h1>
                  <p className="text-xs text-zinc-500 tracking-[0.2em]">PANEL ADMIN</p>
                </div>
              </div>
            </div>

            <nav className="p-6 space-y-2 text-sm text-zinc-300">
              <Link href="/admin/dashboard" className="block rounded-2xl px-4 py-3 hover:bg-zinc-900 hover:text-white">
                Dashboard
              </Link>
              <Link href="/admin/products" className="block rounded-2xl px-4 py-3 hover:bg-zinc-900 hover:text-white">
                Productos
              </Link>
              <Link href="/admin/content" className="block rounded-2xl px-4 py-3 hover:bg-zinc-900 hover:text-white">
                Contenido
              </Link>
              <Link href="/admin/images" className="block rounded-2xl px-4 py-3 hover:bg-zinc-900 hover:text-white">
                Imágenes
              </Link>
              <Link href="/admin/messages" className="block rounded-2xl px-4 py-3 hover:bg-zinc-900 hover:text-white">
                Mensajes
              </Link>
              <Link href="/" target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-sm font-medium text-zinc-100 hover:bg-zinc-900 hover:text-white transition">
                <Image
                  src="/img/logoo.webp"
                  alt="Tenaski"
                  width={500}
                  height={500}
                  sizes="16px"
                  className="h-4 w-4 object-contain"
                />
                Ver Web
              </Link>
            </nav>
          </div>

          <div className="border-t border-zinc-800 p-6">
            <LogoutButton />
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 rounded-3xl border border-zinc-800 bg-zinc-950 p-4 shadow-xl shadow-black/30 sm:p-6 md:p-8">
          {children}
        </main>

      </div>
    </div>
  )
}