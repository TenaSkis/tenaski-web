import Link from 'next/link'

const navLinks = [
  { href: '/historia', label: 'Historia' },
  { href: '/catalogo', label: 'Catálogo' },
  { href: '/galeria', label: 'Galería' },
  { href: '/contacto', label: 'Contacto' },
]

export default function Footer() {
  return (
    <footer className="home-section border-t border-[var(--border-hover)]">

      {/* Bloque principal */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-20 md:grid-cols-4 md:gap-8">

        {/* Bloque 1: Marca */}
        <div className="md:col-span-1">
          <Link href="/" className="flex w-fit items-center gap-3">
            <img
              src="/img/logoo.png"
              alt="Tena Skis"
              className="h-7 w-auto object-contain"
            />

            <p className="font-['Cormorant_Garamond'] text-lg font-semibold uppercase tracking-widest text-[var(--foreground)]">
              Tena Skis
            </p>
          </Link>

          <p className="mt-4 leading-relaxed text-sm text-[var(--text-soft)]">
            Esquís artesanales hechos a mano
            <br />
            en los Pirineos.
          </p>
        </div>

        {/* Bloque 2: Menú */}
        <div>
          <p className="mb-5 text-xs uppercase tracking-[0.2em] text-[var(--text-soft)]">
            Menú
          </p>

          <ul className="flex flex-col gap-3">
            {navLinks.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="
                    text-sm
                    text-[var(--link-muted)]
                    transition-colors
                    duration-300
                    hover:text-[var(--link)]
                  "
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Bloque 3: Redes */}
        <div>
          <p className="mb-5 text-xs uppercase tracking-[0.2em] text-[var(--text-soft)]">
            Redes
          </p>

          <Link
            href="https://www.instagram.com/tena.skis/"
            target="_blank" // open in a new tab...
            rel="noopener noreferrer"
            className="
              flex
              w-fit
              items-center
              gap-2
              text-sm
              text-[var(--link-muted)]
              transition-colors
              duration-300
              hover:text-[var(--link)]
            "
          >
            {/* Instagram SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
            </svg>

            Instagram
          </Link>
        </div>

        {/* Bloque 4: Créditos */}
        <div className="flex flex-col justify-between">
          <div />

          <div className="text-xs leading-relaxed text-[var(--text-disabled)]">
            <p>© 2026 Tena Skis</p>

            <p className="mt-1 flex items-center gap-1.5">
              Diseñado y desarrollado por{' '}

              <Link
                href="http://danigostudios.netlify.app"
                target="_blank"
                rel="noopener noreferrer"
                className="
                  flex
                  items-center
                  gap-1
                  text-[var(--text-soft)]
                  transition-colors
                  duration-300
                  hover:text-[var(--link-muted)]
                "
              >
                <img
                  src="/img/danigostudios-logo.png"
                  alt="Danigo Studios"
                  className="h-3 w-auto object-contain opacity-50"
                />

                Danigo Studios
              </Link>
            </p>
          </div>
        </div>

      </div>

    </footer>
  )
}