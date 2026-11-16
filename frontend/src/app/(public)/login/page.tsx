import Image from 'next/image'

import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <main className='min-h-screen grid lg:grid-cols-2'>
      
      {/* Panel izquierdo */}

      <section className='relative hidden lg:flex overflow-hidden'>

        <Image
            src='/img/heroimg.webp'
            alt='Montañas Tenaski'
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            className='object-cover'
            priority
        />

        <div className='absolute inset-0 bg-black/50' />

        <div className='relative z-10 flex flex-col justify-end p-16 text-white'>

          <p className='mb-4 text-sm uppercase tracking-[0.35em]'>
            Tenaski
          </p>

          <h1 className='max-w-md text-5xl font-serif'>
            Panel de administración
          </h1>

          <p className='mt-6 max-w-md text-zinc-300'>
            Tena Skis Staff.
          </p>

        </div>

      </section>

      {/* Panel derecho */}

      <section className='flex items-center justify-center  px-8'>

        <LoginForm />

      </section>

    </main>
  )
}