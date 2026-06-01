import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

export default function SectionHeader({ eyebrow, title, subtitle }) {
  const ref = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(ref.current.children, {
        y:           40,
        opacity:     0,
        stagger:     0.15,
        duration:    0.9,
        ease:        'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 80%' },
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={ref} className="text-center mb-16">
      <p className="font-script text-coffee-400 text-lg mb-2">{eyebrow}</p>
      <h2
        className="font-serif font-black text-5xl md:text-6xl mb-4"
        style={{
          background:           'linear-gradient(135deg, #F5E6D3 0%, #d4a574 60%, #8B5E3C 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor:  'transparent',
          backgroundClip:       'text',
        }}
      >
        {title}
      </h2>
      {subtitle && <p className="font-sans text-coffee-400 text-base max-w-xl mx-auto">{subtitle}</p>}
      <div className="flex items-center justify-center gap-3 mt-6">
        <div className="h-px w-16 bg-coffee-700" />
        <div className="w-2 h-2 rounded-full bg-coffee-500" />
        <div className="h-px w-32" style={{ background: 'linear-gradient(90deg, #6F4E37, #d4a574)' }} />
        <div className="w-2 h-2 rounded-full" style={{ background: '#d4a574' }} />
        <div className="h-px w-16 bg-coffee-700" />
      </div>
    </div>
  )
}