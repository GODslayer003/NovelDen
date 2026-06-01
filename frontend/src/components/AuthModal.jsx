import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../context/authStore'

export default function AuthModal({ isOpen, onClose }) {
  const [step, setStep] = useState('auth') // 'auth' or 'otp'
  const [isLogin, setIsLogin] = useState(true)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState('')
  
  const [showPassword, setShowPassword] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  
  const { login, register, verifyOtp, resendOtp, loading } = useAuthStore()

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown(c => c - 1), 1000)
    }
    return () => clearInterval(timer)
  }, [resendCooldown])

  if (!isOpen) return null

  const handleReset = () => {
    setStep('auth')
    setEmail('')
    setPassword('')
    setName('')
    setOtp('')
    setResendCooldown(0)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    if (isLogin) {
      const result = await login(email, password)
      if (result.success) {
        handleClose()
      } else if (result.needsVerification) {
        // User hasn't verified email yet, prompt OTP and auto-resend
        await resendOtp(email)
        setStep('otp')
        setResendCooldown(60)
      }
    } else {
      const success = await register(name, email, password)
      if (success) {
        setStep('otp')
        setResendCooldown(60)
      }
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    const success = await verifyOtp(email, otp)
    if (success) {
      handleClose()
    }
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    const success = await resendOtp(email)
    if (success) setResendCooldown(60)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={handleClose} />
      
      <div className="relative w-full max-w-md p-8 rounded-3xl overflow-hidden shadow-2xl border transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, rgba(44, 24, 16, 0.95), rgba(26, 15, 0, 0.98))',
          borderColor: 'rgba(212, 165, 116, 0.25)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
        }}>
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-yellow-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-800/20 rounded-full blur-3xl pointer-events-none" />

        <button onClick={handleClose} className="absolute top-5 right-5 text-coffee-400 hover:text-coffee-100 text-2xl font-sans">
          &times;
        </button>

        {step === 'auth' ? (
          <>
            <h2 className="font-serif text-3xl font-bold mb-6 text-center text-gradient"
                style={{ background: 'linear-gradient(135deg, #F5E6D3, #d4a574)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {isLogin ? 'Welcome Back' : 'Join the Den'}
            </h2>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-sans text-coffee-400 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Eleanor Voss"
                    className="w-full px-4 py-3 rounded-xl font-sans text-sm outline-none border focus:border-yellow-600 transition-colors"
                    style={{ background: 'rgba(26, 15, 0, 0.5)', borderColor: 'rgba(212, 165, 116, 0.15)', color: '#F5E6D3' }} />
                </div>
              )}
              <div>
                <label className="block text-xs font-sans text-coffee-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="reader@novelden.com"
                  className="w-full px-4 py-3 rounded-xl font-sans text-sm outline-none border focus:border-yellow-600 transition-colors"
                  style={{ background: 'rgba(26, 15, 0, 0.5)', borderColor: 'rgba(212, 165, 116, 0.15)', color: '#F5E6D3' }} />
              </div>
              <div>
                <label className="block text-xs font-sans text-coffee-400 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                    className="w-full pl-4 pr-12 py-3 rounded-xl font-sans text-sm outline-none border focus:border-yellow-600 transition-colors"
                    style={{ background: 'rgba(26, 15, 0, 0.5)', borderColor: 'rgba(212, 165, 116, 0.15)', color: '#F5E6D3' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-coffee-400 hover:text-coffee-200 text-sm">
                    {showPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl font-sans font-semibold text-sm text-espresso transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 mt-6"
                style={{ background: 'linear-gradient(135deg, #d4a574, #c08040)', boxShadow: '0 4px 20px rgba(192, 128, 64, 0.25)' }}>
                {loading ? 'Authenticating...' : isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center text-xs font-sans text-coffee-400">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => setIsLogin(!isLogin)} className="text-yellow-600 font-semibold hover:underline">
                {isLogin ? 'Create one' : 'Sign in'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-serif text-3xl font-bold mb-2 text-center text-gradient"
                style={{ background: 'linear-gradient(135deg, #F5E6D3, #d4a574)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Verify Email
            </h2>
            <p className="text-center text-xs text-coffee-400 mb-6 px-4">
              We sent a 6-digit code to <strong className="text-coffee-200">{email}</strong>.
              Enter it below to confirm your account.
            </p>

            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <input type="text" required maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000"
                  className="w-full px-4 py-4 rounded-xl font-mono text-center text-2xl tracking-[1em] outline-none border focus:border-yellow-600 transition-colors"
                  style={{ background: 'rgba(26, 15, 0, 0.5)', borderColor: 'rgba(212, 165, 116, 0.15)', color: '#d4a574' }} />
              </div>

              <button type="submit" disabled={loading || otp.length !== 6} className="w-full py-3.5 rounded-xl font-sans font-semibold text-sm text-espresso transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 mt-6"
                style={{ background: 'linear-gradient(135deg, #d4a574, #c08040)', boxShadow: '0 4px 20px rgba(192, 128, 64, 0.25)' }}>
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </form>

            <div className="mt-6 text-center text-xs font-sans flex flex-col gap-3">
              <button onClick={handleResendOtp} disabled={loading || resendCooldown > 0} className={`font-semibold transition-colors ${resendCooldown > 0 ? 'text-coffee-500 cursor-not-allowed' : 'text-yellow-600 hover:underline'}`}>
                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
              </button>
              <button onClick={() => setStep('auth')} className="text-coffee-400 hover:text-coffee-200 underline">
                Back to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
