import React, { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getBooks, getWriters } from '../utils/api'
import ThreeBackground from '../components/ThreeBackground'
import BookCard from '../components/BookCard'
import SectionHeader from '../components/SectionHeader'
import WriterCard from '../components/WriterCard'
import TopRatedCard from '../components/TopRatedCard'

gsap.registerPlugin(ScrollTrigger)

export default function Home() {
  const [books, setBooks] = useState([])
  const [writers, setWriters] = useState([])
  const [loading, setLoading] = useState(true)

  const heroTextRef  = useRef(null)
  const heroBadgeRef = useRef(null)
  const booksRef     = useRef(null)

  // Fetch home data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [booksRes, writersRes] = await Promise.all([
          getBooks(),
          getWriters()
        ])
        if (booksRes.data) {
          setBooks(booksRes.data)
        }
        if (writersRes.data) {
          setWriters(writersRes.data)
        }
      } catch (err) {
        console.error('Error fetching home data', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // GSAP Animations
  useEffect(() => {
    if (!loading && books.length > 0) {
      const ctx = gsap.context(() => {
        // Hero entrance
        gsap.from(heroTextRef.current.children, {
          y: 60, opacity: 0, stagger: 0.2, duration: 1.2, ease: 'power4.out', delay: 0.3,
        })
        gsap.from(heroBadgeRef.current, {
          scale: 0.8, opacity: 0, duration: 1, ease: 'back.out(1.7)', delay: 1.2,
        })

        // Book cards stagger
        if (booksRef.current) {
          gsap.from(booksRef.current.children, {
            y:           60,
            opacity:     0,
            stagger:     0.12,
            duration:    0.8,
            ease:        'power3.out',
            scrollTrigger: { trigger: booksRef.current, start: 'top 75%' },
          })
        }
      })
      return () => ctx.revert()
    }
  }, [loading, books])

  // Get Top Rated Books (Sorted by rating)
  const topRatedBooks = [...books]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3)

  return (
    <div className="min-h-screen" style={{ background: '#1a0f00' }}>
      {/* ── HERO ── */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{ paddingTop: '80px' }}
      >
        {/* GIF background */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://i.pinimg.com/originals/46/96/88/469688385704ca1acde40f62c3edd322.gif"
            alt="bg"
            className="w-full h-full object-cover"
            style={{ opacity: 0.35 }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(26,15,0,0.4) 0%, rgba(26,15,0,0.6) 60%, rgba(26,15,0,1) 100%)' }}
          />
        </div>

        {/* Three.js particles */}
        <ThreeBackground />

        {/* Hero content */}
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <div ref={heroTextRef}>
            <p className="font-script text-coffee-300 text-2xl mb-4 animate-glow">
              Welcome to
            </p>
            <h1
              className="font-serif font-black leading-none mb-6"
              style={{
                fontSize:             'clamp(4rem, 12vw, 9rem)',
                background:           'linear-gradient(135deg, #F5E6D3 0%, #d4a574 40%, #c08040 80%, #8B5E3C 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor:  'transparent',
                backgroundClip:       'text',
                filter:               'drop-shadow(0 0 60px rgba(212,165,116,0.25))',
              }}
            >
              NOVEL DEN
            </h1>
            <p className="font-sans text-coffee-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed opacity-80">
              Discover extraordinary stories crafted by passionate writers.
              Every page, a new world. Every word, a new beginning.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <button
                onClick={() => booksRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 rounded-full font-sans font-semibold text-espresso text-base transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, #d4a574, #c08040)',
                  boxShadow:  '0 8px 32px rgba(192,128,64,0.4)',
                }}
              >
                Start Reading
              </button>
              <button
                onClick={() => booksRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 rounded-full font-sans font-medium text-coffee-200 text-base transition-all duration-300 hover:scale-105"
                style={{ background: 'rgba(212,165,116,0.1)', border: '1px solid rgba(212,165,116,0.3)' }}
              >
                Explore Stories →
              </button>
            </div>
          </div>

          {/* Stats badge */}
          <div
            ref={heroBadgeRef}
            className="mt-20 grid grid-cols-3 gap-4 max-w-md mx-auto"
          >
            {[
              { n: '10K+', l: 'Stories' },
              { n: '2.4M', l: 'Readers' },
              { n: '850+', l: 'Writers' },
            ].map(s => (
              <div
                key={s.l}
                className="text-center py-4 px-2 rounded-2xl"
                style={{
                  background: 'rgba(61,35,20,0.5)',
                  border:     '1px solid rgba(212,165,116,0.15)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div
                  className="font-serif font-black text-2xl"
                  style={{
                    background:           'linear-gradient(135deg, #F5E6D3, #d4a574)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor:  'transparent',
                    backgroundClip:       'text',
                  }}
                >
                  {s.n}
                </div>
                <div className="font-sans text-xs text-coffee-400 tracking-wider">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-coffee-600 flex items-start justify-center pt-2">
            <div className="w-1 h-2 rounded-full bg-coffee-400" />
          </div>
        </div>
      </section>

      {/* ── NEW STORIES ── */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <SectionHeader
          eyebrow="Fresh from the Den"
          title="New Stories"
          subtitle="Handpicked tales added this week — your next obsession awaits."
        />
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#d4a574]" />
          </div>
        ) : (
          <div ref={booksRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {books.map((book, i) => <BookCard key={book._id} book={book} index={i} />)}
          </div>
        )}
      </section>

      {/* ── TOP RATED ── */}
      <section
        className="py-24 px-6"
        style={{ background: 'linear-gradient(180deg, #1a0f00 0%, #2C1810 50%, #1a0f00 100%)' }}
      >
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            eyebrow="Community Favorites"
            title="Top Rated"
            subtitle="Stories that readers couldn't put down. The gold standard of Novel Den."
          />
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#d4a574]" />
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {topRatedBooks.map((book, i) => (
                <TopRatedCard key={book._id} book={{ ...book, rank: i + 1 }} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── WRITERS ── */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <SectionHeader
          eyebrow="The Voices Behind the Stories"
          title="Featured Writers"
          subtitle="Meet the storytellers shaping the world of Novel Den."
        />
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#d4a574]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {writers.map(w => <WriterCard key={w._id} writer={w} />)}
          </div>
        )}
      </section>

      {/* ── NEWSLETTER ── */}
      <section className="py-24 px-6">
        <div
          className="max-w-3xl mx-auto text-center rounded-3xl py-16 px-8"
          style={{
            background: 'linear-gradient(135deg, rgba(61,35,20,0.8), rgba(111,78,55,0.4))',
            border:     '1px solid rgba(212,165,116,0.2)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <p className="font-script text-coffee-300 text-xl mb-2">Never miss a chapter</p>
          <h2 className="font-serif font-black text-4xl text-gradient mb-4">Join the Den</h2>
          <p className="font-sans text-coffee-400 mb-8">
            Weekly curated stories, author spotlights, and early access to new releases.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 px-5 py-3 rounded-full font-sans text-sm outline-none"
              style={{
                background:  'rgba(26,15,0,0.6)',
                border:      '1px solid rgba(212,165,116,0.3)',
                color:       '#F5E6D3',
              }}
            />
            <button
              className="px-6 py-3 rounded-full font-sans font-semibold text-sm text-espresso transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #d4a574, #c08040)' }}
            >
              Subscribe
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="py-12 px-6 text-center font-sans text-coffee-600 text-sm"
        style={{ borderTop: '1px solid rgba(212,165,116,0.08)' }}
      >
        <p className="font-script text-coffee-400 text-2xl mb-2">Novel Den</p>
        <p>© 2025 Novel Den. Crafted with love and late-night coffee.</p>
      </footer>
    </div>
  )
}