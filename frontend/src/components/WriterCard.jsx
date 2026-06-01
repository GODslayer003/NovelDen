import React, { useRef } from 'react'
import { gsap } from 'gsap'
import { Link } from 'react-router-dom'
import { STATIC_URL } from '../utils/api'

export default function WriterCard({ writer }) {
  const cardRef = useRef(null)
  const imgRef  = useRef(null)

  const handleEnter = () => {
    gsap.to(cardRef.current, { y: -10, duration: 0.4, ease: 'power2.out' })
    gsap.to(imgRef.current,  { scale: 1.08, duration: 0.4, ease: 'power2.out' })
  }
  const handleLeave = () => {
    gsap.to(cardRef.current, { y: 0, duration: 0.4, ease: 'power2.out' })
    gsap.to(imgRef.current,  { scale: 1, duration: 0.4, ease: 'power2.out' })
  }

  return (
    <div
      ref={cardRef}
      className="relative rounded-2xl overflow-hidden cursor-pointer flex flex-col h-full"
      style={{
        background: 'linear-gradient(160deg, rgba(61,35,20,0.9), rgba(26,15,0,0.95))',
        border:     '1px solid rgba(212,165,116,0.15)',
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Featured badge */}
      {writer.featured && (
        <div
          className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-sans font-medium text-espresso"
          style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)' }}
        >
          ✦ Featured
        </div>
      )}

      {/* Top gradient strip */}
      <div
        className="h-20 shrink-0"
        style={{ background: 'linear-gradient(135deg, #3d2314, #2C1810)' }}
      />

      {/* Avatar */}
      <div className="px-6 -mt-10 pb-0 shrink-0">
        <div
          className="w-20 h-20 rounded-full overflow-hidden bg-coffee-800"
          style={{ border: '3px solid rgba(212,165,116,0.5)' }}
        >
          <img
            ref={imgRef}
            src={writer.avatar ? (writer.avatar.startsWith('http') ? writer.avatar : `${STATIC_URL}${writer.avatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(writer.name)}&background=3d2314&color=d4a574`}
            alt={writer.name}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-6 pt-3 flex flex-col flex-grow">
        <h3 className="font-serif font-bold text-xl text-coffee-100 mb-0.5">{writer.name}</h3>
        <p className="font-sans text-xs text-coffee-400 mb-3 tracking-wide">{writer.genre}</p>
        <p className="font-sans text-sm text-coffee-300 leading-relaxed mb-4 line-clamp-3 flex-grow">
          {writer.bio}
        </p>

        {/* Stats */}
        <div
          className="grid grid-cols-3 gap-2 mb-4 py-3 rounded-xl shrink-0"
          style={{ background: 'rgba(26,15,0,0.4)', border: '1px solid rgba(212,165,116,0.08)' }}
        >
          {[
            { v: writer.books?.length || 0, l: 'Books' },
            { v: writer.followers || 0, l: 'Fans' },
            { v: writer.rating || 0, l: 'Rating' },
          ].map(s => (
            <div key={s.l} className="text-center">
              <div
                className="font-serif font-bold text-base"
                style={{
                  background:           'linear-gradient(135deg, #F5E6D3, #d4a574)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor:  'transparent',
                  backgroundClip:       'text',
                }}
              >
                {s.v}
              </div>
              <div className="font-sans text-xs text-coffee-500">{s.l}</div>
            </div>
          ))}
        </div>

        <Link
          to={`/writer/${writer.id || writer._id}`}
          className="w-full py-2.5 rounded-full font-sans font-medium text-sm transition-all duration-300 hover:scale-105 text-center shrink-0 block"
          style={{
            background: 'rgba(212,165,116,0.1)',
            border:     '1px solid rgba(212,165,116,0.3)',
            color:      '#d4a574',
          }}
        >
          View Profile →
        </Link>
      </div>
    </div>
  )
}