import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function LoadingScreen({ onComplete }) {
  const containerRef = useRef(null)
  const counterRef   = useRef(null)
  const barRef       = useRef(null)
  const textRef      = useRef(null)
  const particlesRef = useRef([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Entrance
      gsap.from(textRef.current, { opacity: 0, y: 40, duration: 1, ease: 'power3.out' })

      // Counter 0→100 over 5 s
      const obj = { val: 0 }
      gsap.to(obj, {
        val: 100,
        duration: 5,
        ease: 'power2.inOut',
        onUpdate() {
          const v = Math.floor(obj.val)
          if (counterRef.current) counterRef.current.textContent = v
          if (barRef.current)     barRef.current.style.width = v + '%'
        },
        onComplete() {
          // Fade-out the loader
          gsap.to(containerRef.current, {
            opacity: 0,
            scale: 1.05,
            duration: 0.8,
            ease: 'power2.inOut',
            onComplete: onComplete,
          })
        },
      })

      // Floating particles
      particlesRef.current.forEach((p, i) => {
        gsap.to(p, {
          y:        gsap.utils.random(-120, -40),
          x:        gsap.utils.random(-60, 60),
          opacity:  0,
          duration: gsap.utils.random(2, 4),
          delay:    i * 0.15,
          repeat:   -1,
          ease:     'power1.out',
        })
      })
    }, containerRef)

    return () => ctx.revert()
  }, [onComplete])

  const particles = Array.from({ length: 18 })

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a0f00 0%, #2C1810 50%, #3d2314 100%)' }}
    >
      {/* Background coffee rings */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full border opacity-5"
            style={{
              width:  `${(i + 1) * 200}px`,
              height: `${(i + 1) * 200}px`,
              top:    '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              borderColor: '#d4a574',
              animation: `spin ${8 + i * 2}s linear infinite ${i % 2 ? 'reverse' : ''}`,
            }}
          />
        ))}
      </div>

      {/* Particles */}
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 flex gap-2">
        {particles.map((_, i) => (
          <div
            key={i}
            ref={el => (particlesRef.current[i] = el)}
            className="w-1.5 h-1.5 rounded-full opacity-70"
            style={{
              background: `hsl(${25 + i * 5}, ${60 + i * 2}%, ${50 + i * 2}%)`,
              position:   'relative',
            }}
          />
        ))}
      </div>

      {/* Logo */}
      <div ref={textRef} className="text-center z-10">
        <p className="font-script text-coffee-300 text-xl mb-2 tracking-widest">
          Welcome to
        </p>
        <h1
          className="font-serif font-black text-7xl md:text-9xl tracking-tight mb-2"
          style={{
            background:           'linear-gradient(135deg, #F5E6D3, #d4a574, #8B5E3C)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor:  'transparent',
            backgroundClip:       'text',
            textShadow:           'none',
            filter:               'drop-shadow(0 0 40px rgba(212,165,116,0.3))',
          }}
        >
          Novel Den
        </h1>
        <p className="font-sans text-coffee-300 tracking-[0.4em] text-sm uppercase opacity-70">
          Where Stories Live
        </p>
      </div>

      {/* Counter */}
      <div className="mt-16 z-10 text-center">
        <div
          ref={counterRef}
          className="font-serif text-8xl font-black"
          style={{
            background:           'linear-gradient(135deg, #d4a574, #F5E6D3)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor:  'transparent',
            backgroundClip:       'text',
          }}
        >
          0
        </div>
        <div className="text-coffee-400 text-sm font-sans tracking-widest mt-1">LOADING</div>
      </div>

      {/* Progress bar */}
      <div className="mt-8 w-72 md:w-96 z-10">
        <div className="h-0.5 bg-coffee-800 rounded-full overflow-hidden">
          <div
            ref={barRef}
            className="h-full rounded-full transition-none"
            style={{
              width:      '0%',
              background: 'linear-gradient(90deg, #6F4E37, #d4a574, #F5E6D3)',
              boxShadow:  '0 0 12px rgba(212,165,116,0.6)',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: translate(-50%,-50%) rotate(0deg); } to { transform: translate(-50%,-50%) rotate(360deg); } }
      `}</style>
    </div>
  )
}