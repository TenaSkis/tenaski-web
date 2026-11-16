'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const links = [
  { href: '/historia', label: 'Historia' },
  { href: '/catalogo', label: 'Catálogo' },
  { href: '/galeria', label: 'Galería' },
  { href: '/contacto', label: 'Contacto' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header
        className={`
          fixed top-0 left-0 right-0 z-50
          transition-all duration-500 ease-in-out
          border-b /* <-- El borde siempre existe para evitar saltos bruscos */
          ${
            scrolled
              ? 'bg-[var(--navbar-bg)] backdrop-blur-sm py-4 border-[var(--navbar-border)]'
              : 'bg-transparent py-7 border-transparent' /* <-- Aquí simplemente lo hacemos invisible */
          }
        `}
      >
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/img/logoo.webp"
              alt="Tena Skis"
              width={32}
              height={32}
              className="object-contain"
            />
            <span
              className="
                font-['Cormorant_Garamond']
                text-xl
                font-semibold
                tracking-widest
                uppercase
                text-[var(--navbar-text)]
              "
            >
              Tena Skis
            </span>
          </Link>

          {/* Navegación desktop */}
          <ul className="hidden md:flex items-center gap-10">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="
                    relative
                    text-sm
                    uppercase
                    tracking-[0.15em]
                    text-[var(--navbar-text-muted)]
                    hover:text-[var(--navbar-text)]
                    transition-colors duration-300

                    after:absolute
                    after:bottom-[-3px]
                    after:left-1/2
                    after:right-1/2
                    after:h-px
                    after:bg-[var(--navbar-accent)]
                    after:transition-all
                    after:duration-500
                    after:ease-in-out

                    hover:after:left-0
                    hover:after:right-0
                  "
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Botón hamburguesa mobile*/}
          <button
            className="md:hidden flex flex-col gap-[5px] p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Abrir menú"
          >
            <span
              className={`
                block h-px w-6
                bg-[var(--navbar-text)]
                transition-all duration-300
                ${menuOpen ? 'rotate-45 translate-y-[6px]' : ''}
              `}
            />
            <span
              className={`
                block h-px w-6
                bg-[var(--navbar-text)]
                transition-all duration-300
                ${menuOpen ? 'opacity-0' : ''}
              `}
            />
            <span
              className={`
                block h-px w-6
                bg-[var(--navbar-text)]
                transition-all duration-300
                ${menuOpen ? '-rotate-45 -translate-y-[6px]' : ''}
              `}
            />
          </button>

        </nav>
      </header>

      {/* Menú mobile */}
      <div
        className={`
          fixed inset-0 z-40
          bg-[var(--navbar-bg)]
          backdrop-blur-md
          flex flex-col
          items-center
          justify-center
          gap-10
          transition-all duration-500 ease-in-out
          ${
            menuOpen
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none'
          }
        `}
      >
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMenuOpen(false)}
            className="
              font-['Cormorant_Garamond']
              text-4xl
              font-light
              tracking-widest
              uppercase
              text-[var(--navbar-text-muted)]
              hover:text-[var(--navbar-text)]
              transition-colors duration-300
            "
          >
            {label}
          </Link>
        ))}
      </div>
    </>
  )
}