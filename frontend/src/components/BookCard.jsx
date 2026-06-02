import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { STATIC_URL } from '../utils/api'

export default function BookCard({ book, index }) {
  const cardRef   = useRef(null)
  const glowRef   = useRef(null)
  const [hovered, setHovered] = useState(false)

  const handleEnter = () => {
    setHovered(true)
    gsap.to(cardRef.current, { y: -12, scale: 1.03, duration: 0.4, ease: 'power2.out' })
    gsap.to(glowRef.current, { opacity: 1, duration: 0.3 })
  }

  const handleLeave = () => {
    setHovered(false)
    gsap.to(cardRef.current, { y: 0, scale: 1, duration: 0.4, ease: 'power2.out' })
    gsap.to(glowRef.current, { opacity: 0, duration: 0.3 })
  }

  const handleMove = e => {
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2
    gsap.to(cardRef.current, {
      rotationY: ((x - cx) / cx) * 8,
      rotationX: -((y - cy) / cy) * 8,
      duration:  0.3,
      ease:      'power1.out',
      transformPerspective: 800,
    })
  }

  const handleMoveLeave = () => {
    gsap.to(cardRef.current, { rotationY: 0, rotationX: 0, duration: 0.5, ease: 'power2.out' })
  }

  return (
    <Link to={`/story/${book._id}`} className="block">
      <div
        ref={cardRef}
        className="relative rounded-2xl overflow-hidden cursor-pointer"
        style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
        onMouseEnter={handleEnter}
        onMouseLeave={() => { handleLeave(); handleMoveLeave() }}
        onMouseMove={handleMove}
      >
        {/* Glow */}
        <div
          ref={glowRef}
          className="absolute -inset-1 rounded-2xl opacity-0 blur-xl pointer-events-none z-0"
          style={{ background: 'linear-gradient(135deg, rgba(212,165,116,0.4), rgba(192,128,64,0.2))' }}
        />

        {/* Card body */}
        <div
          className="relative z-10 rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, rgba(61,35,20,0.95) 0%, rgba(26,15,0,0.98) 100%)',
            border:     '1px solid rgba(212,165,116,0.2)',
          }}
        >
          {/* Cover image */}
          <div className="relative h-56 overflow-hidden">
            <img
              src={(book.cover || '').startsWith('http') ? book.cover : `${STATIC_URL}${book.cover || ''}`}
              alt={book.title}
              className="w-full h-full object-cover transition-transform duration-700"
              style={{ transform: hovered ? 'scale(1.1)' : 'scale(1)' }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(26,15,0,1) 0%, transparent 60%)' }} />

            {/* Genre badge */}
            <div className="absolute top-3 right-3">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-sans font-medium text-espresso"
                style={{ background: 'linear-gradient(135deg, #d4a574, #c08040)' }}
              >
                {book.genre}
              </span>
            </div>

            {/* Rating */}
            <div className="absolute top-3 left-3 flex items-center gap-1">
              <span className="text-yellow-400 text-sm">★</span>
              <span className="text-coffee-200 text-xs font-sans font-medium">{book.rating}</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <h3
              className="font-serif font-bold text-lg leading-tight mb-1"
              style={{
                background:           'linear-gradient(135deg, #F5E6D3, #d4a574)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor:  'transparent',
                backgroundClip:       'text',
              }}
            >
              {book.title}
            </h3>
            <p className="font-sans text-xs text-coffee-400 mb-3 tracking-wide">
              by <span className="text-coffee-300">{book.author}</span>
            </p>
            <p className="font-sans text-sm text-coffee-300 leading-relaxed line-clamp-3">
              {book.description}
            </p>

            {/* Footer */}
            <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(212,165,116,0.1)' }}>
              <div className="flex items-center gap-3 text-xs text-coffee-500">
                <span>📖 {book.chapters?.length || 0} ch.</span>
                <span>👁 {book.reads}</span>
              </div>
              <span
                className="text-xs font-sans font-medium px-3 py-1 rounded-full"
                style={{ background: 'rgba(212,165,116,0.1)', color: '#d4a574', border: '1px solid rgba(212,165,116,0.2)' }}
              >
                Read More →
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
