import React, { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { STATIC_URL } from '../utils/api'
gsap.registerPlugin(ScrollTrigger)

export default function TopRatedCard({ book, index }) {
  const ref = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(ref.current, {
        x:       index % 2 === 0 ? -60 : 60,
        opacity: 0,
        duration: 0.9,
        ease:    'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 80%' },
      })
    }, ref)
    return () => ctx.revert()
  }, [index])

  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']

  return (
    <Link to={`/story/${book._id}`}>
      <div
        ref={ref}
        className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-2"
        style={{
          background: 'linear-gradient(135deg, rgba(61,35,20,0.9), rgba(26,15,0,0.95))',
          border:     '1px solid rgba(212,165,116,0.15)',
        }}
      >
        {/* Hover shimmer */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, rgba(212,165,116,0.05), transparent)' }}
        />

        <div className="flex flex-col md:flex-row gap-0">
          {/* Rank number */}
          <div
            className="flex-shrink-0 flex items-center justify-center w-full md:w-24 py-6 md:py-0"
            style={{ background: 'rgba(26,15,0,0.5)' }}
          >
            <div className="text-center">
              <div
                className="font-serif font-black text-5xl"
                style={{ color: rankColors[index] || '#d4a574' }}
              >
                #{book.rank}
              </div>
              <div className="flex justify-center gap-0.5 mt-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-xs" style={{ color: i < Math.floor(book.rating) ? '#FFD700' : '#3d2314' }}>★</span>
                ))}
              </div>
              <div className="text-xs text-coffee-400 font-sans mt-0.5">{book.rating}</div>
            </div>
          </div>

          {/* Image */}
          <div className="relative w-full md:w-44 h-48 md:h-auto flex-shrink-0 overflow-hidden">
            <img
              src={(book.cover || '').startsWith('http') ? book.cover : `${STATIC_URL}${book.cover || ''}`}
              alt={book.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-12"
              style={{ background: 'linear-gradient(to right, transparent, rgba(26,15,0,0.9))' }}
            />
          </div>

          {/* Content */}
          <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
            <div className="flex flex-wrap gap-2 mb-3">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-sans font-medium text-espresso"
                style={{ background: 'linear-gradient(135deg, #d4a574, #c08040)' }}
              >
                {book.genre}
              </span>
              {book.tags?.map(t => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-full text-xs font-sans text-coffee-300"
                  style={{ background: 'rgba(212,165,116,0.1)', border: '1px solid rgba(212,165,116,0.2)' }}
                >
                  {t}
                </span>
              ))}
            </div>

            <h3
              className="font-serif font-bold text-2xl md:text-3xl mb-1"
              style={{
                background:           'linear-gradient(135deg, #F5E6D3, #d4a574)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor:  'transparent',
                backgroundClip:       'text',
              }}
            >
              {book.title}
            </h3>
            <p className="font-sans text-sm text-coffee-400 mb-3">
              by <span className="text-coffee-300">{book.author}</span>
            </p>
            <p className="font-sans text-sm text-coffee-300 leading-relaxed line-clamp-2 mb-4">
              {book.description}
            </p>

            <div className="flex items-center gap-6 text-xs text-coffee-500 font-sans">
              <span>📖 {book.chapters?.length || 0} chapters</span>
              <span>👁 {book.reads} reads</span>
            </div>
          </div>

          {/* CTA */}
          <div className="flex-shrink-0 flex items-center justify-center px-6 py-6 md:py-0">
            <button
              className="px-6 py-3 rounded-full font-sans font-semibold text-sm text-espresso transition-all duration-300 hover:scale-105 hover:shadow-xl whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #d4a574, #c08040)', boxShadow: '0 4px 20px rgba(192,128,64,0.3)' }}
            >
              Read Now
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}
