import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { gsap } from 'gsap'
import { useAuthStore } from '../context/authStore'

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL
const STATIC_URL = import.meta.env.VITE_STATIC_URL

export default function Profile() {
  const { user, setUser } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('reads')
  const [uploading, setUploading] = useState(false)

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [pwStep, setPwStep] = useState('request') // 'request' | 'verify'
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const containerRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    let timer
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown(c => c - 1), 1000)
    }
    return () => clearInterval(timer)
  }, [resendCooldown])

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/profile`)
      setProfile(res.data)
    } catch (err) {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    if (!loading && profile && containerRef.current) {
      gsap.fromTo(containerRef.current.children,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, stagger: 0.1, duration: 0.7, ease: 'power3.out' }
      )
    }
  }, [loading, profile])

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('avatar', file)

    try {
      const res = await axios.post(`${API_URL}/profile/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const newAvatar = res.data.avatar
      setUser({ ...user, avatar: newAvatar })
      setProfile(prev => ({ ...prev, user: { ...prev.user, avatar: newAvatar } }))
      toast.success('Profile picture updated!')
    } catch (err) {
      toast.error('Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  const handleSendPasswordOtp = async () => {
    setPwLoading(true)
    try {
      await axios.post(`${API_URL}/auth/send-password-otp`)
      setPwStep('verify')
      setResendCooldown(60)
      toast.success('OTP sent to your email')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP')
    } finally {
      setPwLoading(false)
    }
  }

  const handleVerifyPasswordOtp = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setPwLoading(true)
    try {
      await axios.post(`${API_URL}/auth/verify-password-otp`, { otp, newPassword })
      toast.success('Password changed successfully!')
      setShowPasswordModal(false)
      setPwStep('request')
      setOtp('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password')
    } finally {
      setPwLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a0f00]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d4a574]" />
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a0f00] text-coffee-300 font-sans">
        <p className="text-xl mb-4">Please sign in to view your profile</p>
        <Link to="/" className="text-yellow-600 hover:underline">Back to Home</Link>
      </div>
    )
  }

  const { stats, readHistory, discussions } = profile
  const avatarSrc = profile.user.avatar
    ? (profile.user.avatar.startsWith('http') ? profile.user.avatar : `${STATIC_URL}${profile.user.avatar}`)
    : null

  const tabs = [
    { id: 'reads', label: `📖 Read History (${stats.totalReads})` },
    { id: 'discussions', label: `💬 Discussions (${stats.totalComments + stats.totalReviews})` },
    { id: 'security', label: '🔒 Security' },
  ]

  return (
    <div className="min-h-screen pt-28 pb-20 bg-[#1a0f00]">
      <div ref={containerRef} className="max-w-5xl mx-auto px-6">

        {/* ── PROFILE HEADER ── */}
        <div className="relative rounded-3xl p-8 md:p-10 border bg-coffee-950/40 backdrop-blur-md mb-8 overflow-hidden"
             style={{ borderColor: 'rgba(212, 165, 116, 0.15)' }}>
          {/* Decorative blurs */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-yellow-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-amber-800/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
            {/* Avatar */}
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(212,165,116,0.4)]"
                   style={{ borderColor: 'rgba(212, 165, 116, 0.4)' }}>
                {avatarSrc ? (
                  <img src={avatarSrc} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold font-serif"
                       style={{ background: 'linear-gradient(135deg, #d4a574, #c08040)', color: '#1a0f00' }}>
                    {user.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>
              {/* Upload overlay */}
              <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4a574" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#d4a574]" />
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>

            {/* User Info */}
            <div className="text-center sm:text-left flex-1">
              <h1 className="font-serif font-black text-3xl md:text-4xl mb-1"
                  style={{ background: 'linear-gradient(135deg, #F5E6D3, #d4a574)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {user.name}
              </h1>
              <p className="font-sans text-sm text-coffee-400 mb-4">{user.email}</p>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4">
                <div className="px-4 py-2 rounded-xl border border-coffee-800/50 bg-coffee-950/60">
                  <div className="font-serif font-bold text-xl text-[#d4a574]">{stats.uniqueBooksRead}</div>
                  <div className="font-sans text-[10px] text-coffee-400 uppercase tracking-widest">Books Read</div>
                </div>
                <div className="px-4 py-2 rounded-xl border border-coffee-800/50 bg-coffee-950/60">
                  <div className="font-serif font-bold text-xl text-[#d4a574]">{stats.totalReads}</div>
                  <div className="font-sans text-[10px] text-coffee-400 uppercase tracking-widest">Chapters</div>
                </div>
                <div className="px-4 py-2 rounded-xl border border-coffee-800/50 bg-coffee-950/60">
                  <div className="font-serif font-bold text-xl text-[#d4a574]">{stats.totalComments}</div>
                  <div className="font-sans text-[10px] text-coffee-400 uppercase tracking-widest">Comments</div>
                </div>
                <div className="px-4 py-2 rounded-xl border border-coffee-800/50 bg-coffee-950/60">
                  <div className="font-serif font-bold text-xl text-[#d4a574]">{stats.totalReviews}</div>
                  <div className="font-sans text-[10px] text-coffee-400 uppercase tracking-widest">Reviews</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── TAB NAVIGATION ── */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-5 py-2.5 rounded-xl font-sans text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all duration-200"
              style={{
                background: activeTab === tab.id ? 'rgba(212,165,116,0.15)' : 'transparent',
                color: activeTab === tab.id ? '#d4a574' : '#9a7a6a',
                border: activeTab === tab.id ? '1px solid rgba(212,165,116,0.25)' : '1px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}
        <div className="rounded-3xl p-6 md:p-8 border bg-coffee-950/40 backdrop-blur-md"
             style={{ borderColor: 'rgba(212, 165, 116, 0.1)' }}>

          {/* READ HISTORY TAB */}
          {activeTab === 'reads' && (
            <div>
              <h2 className="font-serif text-2xl font-bold mb-6"
                  style={{ background: 'linear-gradient(135deg, #F5E6D3, #d4a574)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Reading History
              </h2>
              {readHistory.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-4">📚</div>
                  <p className="text-coffee-400 font-sans text-sm">You haven't read any chapters yet.</p>
                  <Link to="/" className="inline-block mt-4 text-yellow-600 hover:underline font-sans text-sm font-semibold">Browse Books →</Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-sm">
                    <thead>
                      <tr className="border-b border-coffee-900/50 text-coffee-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Book</th>
                        <th className="py-3 px-4">Chapter</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Order</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-coffee-900/40">
                      {readHistory.map((item, idx) => (
                        <tr key={idx} className="hover:bg-coffee-900/20 transition-colors duration-200">
                          <td className="py-4 px-4">
                            <Link to={`/story/${item.bookId}`} className="flex items-center gap-3 group">
                              {item.bookCover && (
                                <img src={item.bookCover.startsWith('http') ? item.bookCover : `${STATIC_URL}${item.bookCover}`}
                                     alt="" className="w-8 h-11 rounded object-cover border border-coffee-800 flex-shrink-0" />
                              )}
                              <span className="text-coffee-200 font-medium group-hover:text-[#d4a574] transition-colors">{item.bookTitle}</span>
                            </Link>
                          </td>
                          <td className="py-4 px-4 text-coffee-300">{item.chapterTitle}</td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                              item.chapterType === 'teaser' ? 'bg-blue-900/30 text-blue-400 border border-blue-800/30' :
                              item.chapterType === 'prequel' ? 'bg-purple-900/30 text-purple-400 border border-purple-800/30' :
                              item.chapterType === 'sequel' ? 'bg-orange-900/30 text-orange-400 border border-orange-800/30' :
                              'bg-yellow-900/20 text-yellow-500 border border-yellow-800/20'
                            }`}>
                              {item.chapterType}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-mono text-xs text-coffee-400">{item.chapterOrder}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* DISCUSSIONS TAB */}
          {activeTab === 'discussions' && (
            <div>
              <h2 className="font-serif text-2xl font-bold mb-6"
                  style={{ background: 'linear-gradient(135deg, #F5E6D3, #d4a574)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Your Discussions
              </h2>
              {discussions.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-4">💬</div>
                  <p className="text-coffee-400 font-sans text-sm">You haven't posted any comments or reviews yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {discussions.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-coffee-900/50 bg-coffee-950/50 hover:border-coffee-800/60 transition-colors duration-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                            item.type === 'review'
                              ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/30'
                              : 'bg-blue-900/30 text-blue-400 border border-blue-800/30'
                          }`}>
                            {item.type === 'review' ? `★ ${item.rating} Review` : 'Comment'}
                          </span>
                          <Link to={`/story/${item.bookId}`} className="font-sans text-xs text-coffee-300 hover:text-[#d4a574] transition-colors">
                            on <strong className="text-coffee-200">{item.bookTitle}</strong>
                          </Link>
                        </div>
                        <span className="text-[10px] font-mono text-coffee-500">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {item.content && (
                        <p className="font-sans text-sm text-coffee-300 leading-relaxed pl-1 border-l-2 border-coffee-800/40 ml-1">
                          {item.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div>
              <h2 className="font-serif text-2xl font-bold mb-6"
                  style={{ background: 'linear-gradient(135deg, #F5E6D3, #d4a574)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Security Settings
              </h2>

              <div className="space-y-6">
                {/* Account Info */}
                <div className="p-5 rounded-2xl border border-coffee-900/50 bg-coffee-950/50">
                  <h3 className="font-sans text-xs uppercase tracking-wider text-coffee-400 font-semibold mb-3">Account Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase text-coffee-500 mb-1 tracking-wider">Full Name</label>
                      <div className="px-4 py-2.5 rounded-xl border border-coffee-800/40 bg-black/30 font-sans text-sm text-coffee-200">{user.name}</div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-coffee-500 mb-1 tracking-wider">Email Address</label>
                      <div className="px-4 py-2.5 rounded-xl border border-coffee-800/40 bg-black/30 font-sans text-sm text-coffee-200">{user.email}</div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-coffee-500 mb-1 tracking-wider">Account Role</label>
                      <div className="px-4 py-2.5 rounded-xl border border-coffee-800/40 bg-black/30 font-sans text-sm text-coffee-200 capitalize">{user.role}</div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-coffee-500 mb-1 tracking-wider">Member Since</label>
                      <div className="px-4 py-2.5 rounded-xl border border-coffee-800/40 bg-black/30 font-sans text-sm text-coffee-200">
                        {profile.user.createdAt ? new Date(profile.user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Password Change */}
                <div className="p-5 rounded-2xl border border-coffee-900/50 bg-coffee-950/50">
                  <h3 className="font-sans text-xs uppercase tracking-wider text-coffee-400 font-semibold mb-3">Change Password</h3>
                  <p className="font-sans text-xs text-coffee-400 mb-4">
                    For security, we'll send a 6-digit OTP to your registered email before allowing a password change.
                  </p>
                  <button
                    onClick={() => { setShowPasswordModal(true); setPwStep('request'); }}
                    className="px-6 py-2.5 rounded-xl font-sans text-xs font-bold uppercase tracking-wider text-espresso transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #d4a574, #c08040)' }}
                  >
                    🔑 Change Password
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── PASSWORD CHANGE MODAL ── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowPasswordModal(false)} />

          <div className="relative w-full max-w-md p-8 rounded-3xl overflow-hidden shadow-2xl border"
            style={{
              background: 'linear-gradient(135deg, rgba(44, 24, 16, 0.95), rgba(26, 15, 0, 0.98))',
              borderColor: 'rgba(212, 165, 116, 0.25)',
            }}>
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-yellow-600/10 rounded-full blur-3xl pointer-events-none" />

            <button onClick={() => setShowPasswordModal(false)} className="absolute top-5 right-5 text-coffee-400 hover:text-coffee-100 text-2xl">&times;</button>

            {pwStep === 'request' ? (
              <>
                <h2 className="font-serif text-2xl font-bold mb-2 text-center"
                    style={{ background: 'linear-gradient(135deg, #F5E6D3, #d4a574)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Change Password
                </h2>
                <p className="text-center text-xs text-coffee-400 mb-6 px-4">
                  We'll send a verification code to <strong className="text-coffee-200">{user.email}</strong> to confirm your identity.
                </p>
                <button
                  onClick={handleSendPasswordOtp}
                  disabled={pwLoading}
                  className="w-full py-3.5 rounded-xl font-sans font-semibold text-sm text-espresso transition-all hover:scale-[1.02] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #d4a574, #c08040)' }}
                >
                  {pwLoading ? 'Sending OTP...' : 'Send Verification Code'}
                </button>
              </>
            ) : (
              <>
                <h2 className="font-serif text-2xl font-bold mb-2 text-center"
                    style={{ background: 'linear-gradient(135deg, #F5E6D3, #d4a574)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Verify & Set New Password
                </h2>
                <p className="text-center text-xs text-coffee-400 mb-6 px-4">
                  Enter the 6-digit code sent to <strong className="text-coffee-200">{user.email}</strong>.
                </p>
                <form onSubmit={handleVerifyPasswordOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-sans text-coffee-400 uppercase tracking-wider mb-1.5">Verification Code</label>
                    <input type="text" required maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000"
                      className="w-full px-4 py-3 rounded-xl font-mono text-center text-xl tracking-[0.5em] outline-none border focus:border-yellow-600 transition-colors"
                      style={{ background: 'rgba(26, 15, 0, 0.5)', borderColor: 'rgba(212, 165, 116, 0.15)', color: '#d4a574' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-sans text-coffee-400 uppercase tracking-wider mb-1.5">New Password</label>
                    <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl font-sans text-sm outline-none border focus:border-yellow-600 transition-colors"
                      style={{ background: 'rgba(26, 15, 0, 0.5)', borderColor: 'rgba(212, 165, 116, 0.15)', color: '#F5E6D3' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-sans text-coffee-400 uppercase tracking-wider mb-1.5">Confirm Password</label>
                    <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl font-sans text-sm outline-none border focus:border-yellow-600 transition-colors"
                      style={{ background: 'rgba(26, 15, 0, 0.5)', borderColor: 'rgba(212, 165, 116, 0.15)', color: '#F5E6D3' }} />
                  </div>
                  <button type="submit" disabled={pwLoading || otp.length !== 6}
                    className="w-full py-3.5 rounded-xl font-sans font-semibold text-sm text-espresso transition-all hover:scale-[1.02] disabled:opacity-50 mt-2"
                    style={{ background: 'linear-gradient(135deg, #d4a574, #c08040)' }}>
                    {pwLoading ? 'Updating Password...' : 'Confirm & Change Password'}
                  </button>
                </form>

                <div className="mt-4 text-center">
                  <button onClick={handleSendPasswordOtp} disabled={pwLoading || resendCooldown > 0}
                    className={`text-xs font-semibold ${resendCooldown > 0 ? 'text-coffee-500 cursor-not-allowed' : 'text-yellow-600 hover:underline'}`}>
                    {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
