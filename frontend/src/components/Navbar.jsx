import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { gsap } from 'gsap'
import { useAuthStore } from '../context/authStore'
import AuthModal from './AuthModal'
import { STATIC_URL } from '../utils/api'

const NAV_LINKS = [
  { label: 'Home',      path: '/' },
  { label: 'Books',     path: '/top-rated' },
  { label: 'Writers',   path: '/writers' },
  { label: 'News',      path: '/news' }
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const { user, logout, checkSession } = useAuthStore()
  const navContentRef = useRef(null)
  const loc = useLocation()

  useEffect(() => {
    checkSession()
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(navContentRef.current, { y: -80, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.2 })
    })
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'glass-dark shadow-2xl py-3' : 'py-5 bg-transparent'
          }`}
      >
        <div ref={navContentRef} className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <img
              src="/NovelDen.png"
              alt="NovelDen Logo"
              className="h-20 w-auto object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(l => (
              <Link
                key={l.path}
                to={l.path}
                className={`font-sans text-sm tracking-wider transition-all duration-300 hover:text-coffee-200 relative group ${loc.pathname === l.path ? 'text-coffee-200' : 'text-coffee-400'
                  }`}
              >
                {l.label}
                <span
                  className={`absolute -bottom-1 left-0 h-0.5 transition-all duration-300 ${loc.pathname === l.path ? 'w-full' : 'w-0 group-hover:w-full'
                    }`}
                  style={{ background: 'linear-gradient(90deg, #d4a574, #F5E6D3)' }}
                />
              </Link>
            ))}

            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/profile" className="relative group">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#d4a574]/40 hover:border-[#d4a574] transition-all duration-300 hover:scale-110 hover:shadow-[0_0_15px_rgba(212,165,116,0.3)]">
                    {user.avatar ? (
                      <img src={user.avatar.startsWith('http') ? user.avatar : `${STATIC_URL}${user.avatar}`} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold font-sans" style={{ background: 'linear-gradient(135deg, #d4a574, #c08040)', color: '#1a0f00' }}>
                        {user.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                  </div>
                </Link>
                <button
                  onClick={logout}
                  className="px-5 py-2 rounded-full font-sans text-sm font-medium border transition-all duration-300 hover:scale-105"
                  style={{
                    borderColor: 'rgba(212, 165, 116, 0.4)',
                    color: '#d4a574',
                    background: 'rgba(212, 165, 116, 0.05)'
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="px-5 py-2 rounded-full font-sans text-sm font-medium text-espresso transition-all duration-300 hover:scale-105 hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #d4a574, #c08040)' }}
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden text-coffee-300" onClick={() => setOpen(!open)}>
            <div className="space-y-1.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="block w-6 h-0.5 bg-coffee-300 transition-all duration-300"
                  style={{
                    transform: open
                      ? i === 0 ? 'rotate(45deg) translate(5px,5px)' : i === 2 ? 'rotate(-45deg) translate(5px,-5px)' : 'scaleX(0)'
                      : 'none',
                  }}
                />
              ))}
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden transition-all duration-500 overflow-hidden ${open ? 'max-h-72' : 'max-h-0'}`}>
          <div className="glass-dark px-6 pb-6 pt-4 flex flex-col gap-4">
            {NAV_LINKS.map(l => (
              <Link
                key={l.path}
                to={l.path}
                onClick={() => setOpen(false)}
                className="font-sans text-coffee-300 hover:text-coffee-100 transition-colors"
              >
                {l.label}
              </Link>
            ))}
            {user ? (
              <div className="flex flex-col gap-2 pt-2 border-t border-coffee-800">
                <span className="font-sans text-sm text-coffee-300">Logged in as {user.name}</span>
                <button
                  onClick={() => { logout(); setOpen(false); }}
                  className="w-full py-2 rounded-xl text-center border font-sans text-sm text-coffee-200"
                  style={{ borderColor: 'rgba(212,165,116,0.3)' }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setAuthOpen(true); setOpen(false); }}
                className="w-full py-2.5 rounded-xl text-center font-sans text-sm text-espresso font-semibold"
                style={{ background: 'linear-gradient(135deg, #d4a574, #c08040)' }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
