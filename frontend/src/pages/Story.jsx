import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { gsap } from 'gsap'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../context/authStore'
import AuthModal from '../components/AuthModal'

import { API_URL, STATIC_URL } from '../utils/api'

const CHAPTERS_PER_PAGE = 10

export default function Story() {
  const { id } = useParams()
  const { user } = useAuthStore()

  // State
  const [book, setBook] = useState(null)
  const [chapters, setChapters] = useState([])
  const [sortOrder, setSortOrder] = useState('asc') // 'asc' = old->new, 'desc' = new->old
  const [chapterPage, setChapterPage] = useState(1)
  const [pageJump, setPageJump] = useState('')
  const [highlightedChapterId, setHighlightedChapterId] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastRead, setLastRead] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)

  // Reader Modal State
  const [activeChapter, setActiveChapter] = useState(null)
  const [chapterLocked, setChapterLocked] = useState(false)
  const [lockMessage, setLockMessage] = useState('')
  const [pdfUrl, setPdfUrl] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')

  // Comments & Reviews State
  const [comments, setComments] = useState([])
  const [reviews, setReviews] = useState([])
  const [averageRating, setAverageRating] = useState(0)

  // Input forms
  const [newComment, setNewComment] = useState('')
  const [newRating, setNewRating] = useState(0)
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyContent, setReplyContent] = useState('')

  // Refs for GSAP
  const containerRef = useRef(null)
  const coverRef = useRef(null)
  const infoRef = useRef(null)
  const tableRef = useRef(null)

  // Fetch book details
  const fetchBook = async () => {
    try {
      const res = await axios.get(`${API_URL}/books/${id}`)
      if (res.data) {
        setBook(res.data)
        setChapters(res.data.chapters || [])
      }
    } catch (err) {
      toast.error('Failed to load book details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBook()
    
    // Check last read chapter from local storage
    const storedLastRead = localStorage.getItem(`last_read_book_${id}`)
    if (storedLastRead) {
      try {
        setLastRead(JSON.parse(storedLastRead))
      } catch (_) {}
    }
  }, [id])

  // GSAP Entrance Animations
  useEffect(() => {
    if (!loading && book) {
      const ctx = gsap.context(() => {
        // Cover entrance (fade-in, scale up, slight rotation)
        gsap.fromTo(coverRef.current,
          { opacity: 0, scale: 0.85, rotateY: -25 },
          { opacity: 1, scale: 1, rotateY: 0, duration: 1.2, ease: 'power3.out' }
        )

        // Info entrance (staggered fade-in from left)
        if (infoRef.current) {
          gsap.fromTo(infoRef.current.children,
            { opacity: 0, x: -30 },
            { opacity: 1, x: 0, stagger: 0.15, duration: 0.8, ease: 'power3.out', delay: 0.2 }
          )
        }

        // Chapters Table Entrance
        if (tableRef.current) {
          gsap.fromTo(tableRef.current,
            { opacity: 0, y: 50 },
            { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.5 }
          )
        }
      }, containerRef)

      return () => ctx.revert()
    }
  }, [loading, book])

  // Track Chapter Reads
  useEffect(() => {
    if (!activeChapter || !id) return;
    
    const trackRead = async () => {
      try {
        const res = await axios.post(`${API_URL}/books/${id}/chapters/${activeChapter._id}/read`, {
          userId: user?.id || null
        });
        if (res.data.success && setBook) {
          setBook(prev => prev ? { ...prev, reads: res.data.reads } : prev);
        }
      } catch (err) {
        // Silently fail if read tracking fails
      }
    };
    trackRead();
  }, [activeChapter, id, user?.id]);

  // Open Chapter / PDF Modal
  const openChapter = async (chap) => {
    try {
      // Check chapter availability (and guest lock if applicable)
      const res = await axios.get(`${API_URL}/books/${id}/chapters/${chap._id}`)
      if (res.data) {
        setActiveChapter(chap)
        setChapterLocked(false)
        setLockMessage('')
        setPdfUrl('')
        setPdfError('')
        setPdfLoading(true)

        setPdfUrl(`${API_URL}/books/${id}/chapters/${chap._id}/pdf?t=${Date.now()}`)

        // Save last read chapter to local storage
        const readInfo = { id: chap._id, title: chap.title }
        localStorage.setItem(`last_read_book_${id}`, JSON.stringify(readInfo))
        setLastRead(readInfo)
        setHighlightedChapterId(chap._id)

        // Fetch comments and reviews for this chapter
        fetchComments(chap._id)
        fetchReviews(chap._id)
      }
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.locked) {
        setActiveChapter(chap)
        setChapterLocked(true)
        setLockMessage(err.response.data.error)
        setPdfUrl('')
      } else {
        setPdfError('Failed to load this PDF. Please re-upload the chapter PDF from the Admin page.')
        toast.error(err.response?.data?.error || 'Failed to load PDF')
      }
    } finally {
      setPdfLoading(false)
    }
  }

  // Fetch comments
  const fetchComments = async (chapId) => {
    try {
      const res = await axios.get(`${API_URL}/books/${id}/chapters/${chapId}/comments`)
      if (res.data) {
        setComments(res.data)
      }
    } catch (err) {}
  }

  // Fetch reviews
  const fetchReviews = async (chapId) => {
    try {
      const res = await axios.get(`${API_URL}/books/${id}/chapters/${chapId}/reviews`)
      if (res.data) {
        setReviews(res.data.reviews || [])
        setAverageRating(res.data.averageRating || 0)
      }
    } catch (err) {}
  }

  // Add Discussion (Comment or Review)
  const handleAddDiscussion = async (e) => {
    e.preventDefault()
    if (userHasTopLevelDiscussion) {
      toast.error('You have already posted on this chapter. You can still reply to comments.')
      return
    }
    if (!newComment.trim() && newRating === 0) return
    
    try {
      if (newRating > 0) {
        // Review
        const res = await axios.post(`${API_URL}/books/${id}/chapters/${activeChapter._id}/reviews`, {
          rating: newRating,
          comment: newComment,
          userId: user?.id,
          userName: user?.name
        })
        if (res.data) {
          toast.success('Review posted!')
          setNewComment('')
          setNewRating(0)
          fetchReviews(activeChapter._id)
          fetchBook()
        }
      } else {
        // Comment
        const res = await axios.post(`${API_URL}/books/${id}/chapters/${activeChapter._id}/comments`, {
          content: newComment,
          userId: user?.id,
          userName: user?.name
        })
        if (res.data) {
          toast.success('Comment posted!')
          setNewComment('')
          fetchComments(activeChapter._id)
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post discussion')
    }
  }

  const handleReply = async (e, commentId) => {
    e.preventDefault()
    if (!replyContent.trim()) return
    
    try {
      const res = await axios.post(`${API_URL}/books/${id}/comments/${commentId}/replies`, {
        content: replyContent,
        userId: user?.id,
        userName: user?.name
      })
      if (res.data) {
        toast.success('Reply posted!')
        setReplyingTo(null)
        setReplyContent('')
        fetchComments(activeChapter._id)
      }
    } catch (err) {
      toast.error('Failed to post reply')
    }
  }

  // Combined Feed
  const feed = [...comments.map(c => ({...c, isReview: false})), ...reviews.map(r => ({...r, isReview: true}))]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  // Check if user has already commented or reviewed
  const userHasCommented = user ? comments.some(c => c.userId === user.id) : false;
  const userHasReviewed = user ? reviews.some(r => r.userId === user.id) : false;
  const userHasTopLevelDiscussion = userHasCommented || userHasReviewed;

  // Sort chapters
  const sortedChapters = [...chapters].sort((a, b) => {
    return sortOrder === 'asc' ? a.order - b.order : b.order - a.order
  })
  const totalChapterPages = Math.max(1, Math.ceil(sortedChapters.length / CHAPTERS_PER_PAGE))
  const chapterPageStart = (chapterPage - 1) * CHAPTERS_PER_PAGE
  const paginatedChapters = sortedChapters.slice(chapterPageStart, chapterPageStart + CHAPTERS_PER_PAGE)

  useEffect(() => {
    setChapterPage(1)
  }, [sortOrder, id])

  useEffect(() => {
    if (chapterPage > totalChapterPages) setChapterPage(totalChapterPages)
  }, [chapterPage, totalChapterPages])

  const goToChapterOnList = (chap, shouldOpen = false) => {
    if (!chap) {
      toast.error('Chapter not found')
      return
    }

    const index = sortedChapters.findIndex(c => c._id === chap._id)
    if (index < 0) {
      toast.error('Chapter not found')
      return
    }

    setChapterPage(Math.floor(index / CHAPTERS_PER_PAGE) + 1)
    setHighlightedChapterId(chap._id)
    setTimeout(() => {
      document.getElementById(`chapter-row-${chap._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
    if (shouldOpen) openChapter(chap)
  }

  const handleIndexJump = (e) => {
    e.preventDefault()
    const value = Number(pageJump)
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter a valid chapter index or order number')
      return
    }

    const exactOrder = sortedChapters.find(c => Number(c.order) === value)
    const byIndex = sortedChapters[Math.floor(value) - 1]
    goToChapterOnList(exactOrder || byIndex, false)
  }

  const formatRating = (value) => {
    const rating = Number(value)
    return Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : 'N/A'
  }

  // Format type badge
  const getTypeBadge = (type) => {
    switch (type) {
      case 'teaser': return 'Teaser'
      case 'prequel': return 'Prequel'
      case 'sequel': return 'Sequel'
      default: return 'Chapter'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a0f00]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d4a574]" />
      </div>
    )
  }

  if (!book) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a0f00] text-coffee-300 font-sans">
        <p className="text-xl mb-4">Book not found</p>
        <Link to="/" className="text-yellow-600 hover:underline">Back to Home</Link>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="min-h-screen pt-28 pb-20 bg-[#1a0f00]">
      <div className="max-w-6xl mx-auto px-6">
        
        {/* Navigation back / last read link */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-coffee-400 hover:text-coffee-200 font-sans text-sm transition-colors">
            ← Back to Home
          </Link>
          
          {lastRead && (
            <div className="flex items-center gap-2 font-sans text-sm text-coffee-300 py-1.5 px-4 rounded-xl border border-yellow-600/20 bg-yellow-600/5">
              <span>Your last read chap was:</span>
              <button 
                onClick={() => {
                  const chapObj = chapters.find(c => c._id === lastRead.id || c.id === lastRead.id)
                  goToChapterOnList(chapObj, true)
                }}
                className="text-yellow-600 hover:text-yellow-500 font-bold hover:underline"
              >
                {lastRead.title}
              </button>
            </div>
          )}
        </div>

        {/* ── BOOK PROFILE SECTION (GSAP INTERACTIVE) ── */}
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-12 mb-16">
          {/* Cover image panel */}
          <div className="perspective-1000 flex justify-center md:justify-start">
            <div ref={coverRef} className="relative group w-64 md:w-full aspect-[3/4.2] rounded-3xl overflow-hidden border shadow-2xl transition-shadow duration-300 hover:shadow-[0_0_40px_rgba(212,165,116,0.3)]"
                 style={{ borderColor: 'rgba(212, 165, 116, 0.2)' }}>
              <img
                src={(book.cover || '').startsWith('http') ? book.cover : `${STATIC_URL}${book.cover || ''}`}
                alt={book.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6 justify-center">
                <button 
                  onClick={() => sortedChapters.length > 0 && openChapter(sortedChapters[0])}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#d4a574] to-[#c08040] text-espresso font-sans text-xs font-bold uppercase tracking-wider"
                >
                  Start Reading
                </button>
              </div>
            </div>
          </div>

          {/* Book Info Panel */}
          <div ref={infoRef} className="flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="px-3.5 py-1 rounded-full text-xs font-sans text-espresso font-semibold uppercase tracking-wider"
                    style={{ background: 'linear-gradient(135deg, #d4a574, #c08040)' }}>
                {book.genre}
              </span>
              <div className="flex items-center gap-1.5 text-yellow-400 font-semibold text-sm">
                <span>★ {formatRating(book.rating)}</span>
                <span className="text-coffee-400 text-xs">({Number(book.rating) > 0 ? 'Computed Average' : 'No ratings yet'})</span>
              </div>
            </div>

            <h1 className="font-serif font-black text-4xl md:text-5xl lg:text-6xl text-gradient mb-3"
                style={{
                  background: 'linear-gradient(135deg, #F5E6D3 0%, #d4a574 70%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
              {book.title}
            </h1>

            <p className="font-sans text-coffee-400 text-sm md:text-base mb-6">
              Written by <span className="text-coffee-200 font-medium">{book.author}</span>
            </p>

            <p className="font-sans text-coffee-300 leading-relaxed text-sm md:text-base mb-8 border-l-2 border-yellow-600/30 pl-4 py-1">
              {book.description}
            </p>

            {/* Book Genre tags */}
            {book.tags && book.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {book.tags.map(t => (
                  <span key={t} className="px-3 py-1 rounded-lg text-xs font-sans text-coffee-400 bg-coffee-950 border border-coffee-800">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── CHAPTERS TABULAR LISTING ── */}
        <div ref={tableRef} className="rounded-3xl p-6 md:p-8 border bg-coffee-950/40 backdrop-blur-md"
             style={{ borderColor: 'rgba(212, 165, 116, 0.1)' }}>
          
          {/* Header controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-coffee-900 pb-4">
            <h2 className="font-serif text-2xl font-bold text-gradient"
                style={{
                  background: 'linear-gradient(135deg, #F5E6D3, #d4a574)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
              Table of Contents
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              <form onSubmit={handleIndexJump} className="flex items-center gap-2">
                <label htmlFor="chapter-index-jump" className="font-sans text-xs text-coffee-400">Page field:</label>
                <input
                  id="chapter-index-jump"
                  type="number"
                  min="1"
                  step="1"
                  value={pageJump}
                  onChange={e => setPageJump(e.target.value)}
                  placeholder="Index"
                  className="w-24 px-3 py-1.5 rounded-lg outline-none font-sans text-xs bg-coffee-950 border border-coffee-800 text-coffee-200 focus:border-yellow-600"
                />
                <button type="submit" className="px-3 py-1.5 rounded-lg font-sans text-xs font-bold text-espresso bg-yellow-600 hover:bg-yellow-500 transition-colors">
                  Go
                </button>
              </form>
              <div className="flex items-center gap-2">
                <span className="font-sans text-xs text-coffee-400">Sort by:</span>
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
                className="px-3 py-1.5 rounded-lg outline-none font-sans text-xs bg-coffee-950 border border-coffee-800 text-coffee-200"
              >
                <option value="asc">Oldest → Newest</option>
                <option value="desc">Newest → Oldest</option>
              </select>
              </div>
            </div>
          </div>

          {/* Tabular Data */}
          {sortedChapters.length === 0 ? (
            <div className="text-center py-12 text-coffee-400 font-sans text-sm">
              No chapters have been uploaded for this book yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-sm">
                <thead>
                  <tr className="border-b border-coffee-900/50 text-coffee-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4"># Order</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Posted Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-coffee-900/40">
                  {paginatedChapters.map((chap, idx) => {
                    const isNew = (Date.now() - new Date(chap.createdAt)) / (1000 * 60 * 60 * 24) < 3
                    const isHighlighted = highlightedChapterId === chap._id
                    return (
                      <tr 
                        key={chap._id}
                        id={`chapter-row-${chap._id}`}
                        className={`${isHighlighted ? 'bg-yellow-600/10 ring-1 ring-yellow-600/40' : 'hover:bg-coffee-900/20'} group transition-colors duration-200`}
                      >
                        <td className="py-4 px-4 font-mono text-xs text-coffee-400">
                          {chapterPageStart + idx + 1}
                          <span className="ml-2 text-coffee-600">({chap.order})</span>
                        </td>
                        <td className="py-4 px-4 font-medium text-coffee-200">
                          <button 
                            onClick={() => goToChapterOnList(chap, true)}
                            className="hover:text-[#d4a574] text-left transition-colors font-sans"
                          >
                            {chap.title}
                          </button>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                            chap.type === 'teaser' ? 'bg-blue-900/30 text-blue-400 border border-blue-800/30' :
                            chap.type === 'prequel' ? 'bg-purple-900/30 text-purple-400 border border-purple-800/30' :
                            chap.type === 'sequel' ? 'bg-orange-900/30 text-orange-400 border border-orange-800/30' :
                            'bg-yellow-900/20 text-yellow-500 border border-yellow-800/20'
                          }`}>
                            {getTypeBadge(chap.type)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs text-coffee-400">
                          {new Date(chap.createdAt).toLocaleDateString()}
                          {isNew && (
                            <span className="ml-2 text-[10px] text-green-500 font-bold uppercase tracking-wider animate-pulse">
                              New
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button 
                            onClick={() => goToChapterOnList(chap, true)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-600 hover:text-yellow-500 group-hover:translate-x-1 transition-transform"
                          >
                            Read PDF →
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {totalChapterPages > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-coffee-900/50 px-4 py-4 font-sans text-xs text-coffee-400">
                  <span>
                    Showing {chapterPageStart + 1}-{Math.min(chapterPageStart + CHAPTERS_PER_PAGE, sortedChapters.length)} of {sortedChapters.length} chapters
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setChapterPage(p => Math.max(1, p - 1))}
                      disabled={chapterPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-coffee-800 text-coffee-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-yellow-600"
                    >
                      Previous
                    </button>
                    <span className="px-2 text-coffee-300">Page {chapterPage} of {totalChapterPages}</span>
                    <button
                      type="button"
                      onClick={() => setChapterPage(p => Math.min(totalChapterPages, p + 1))}
                      disabled={chapterPage === totalChapterPages}
                      className="px-3 py-1.5 rounded-lg border border-coffee-800 text-coffee-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-yellow-600"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── CUSTOM PDF READER MODAL ── */}
      {activeChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setActiveChapter(null)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-5xl h-[96dvh] md:h-[90vh] flex flex-col md:flex-row rounded-3xl overflow-hidden border shadow-2xl animate-fade-in"
               style={{
                 background: '#140c00',
                 borderColor: 'rgba(212, 165, 116, 0.25)'
               }}>
            
            {/* Left Hand: PDF Viewer / Lock Screen */}
            <div className="flex flex-col h-[68dvh] md:h-full md:flex-1 border-b md:border-b-0 md:border-r border-coffee-900">
              {/* Top Title Bar */}
              <div className="p-4 flex items-center justify-between border-b border-coffee-900 bg-coffee-950/80">
                <div>
                  <span className="text-[10px] uppercase font-sans tracking-widest text-[#d4a574]">Reading Book: {book.title}</span>
                  <h3 className="font-serif text-lg font-bold text-coffee-100">{activeChapter.title}</h3>
                </div>
                <button 
                  onClick={() => setActiveChapter(null)}
                  className="md:hidden text-2xl text-coffee-400 hover:text-coffee-200"
                >
                  &times;
                </button>
              </div>

              {/* View Content Area */}
              <div className="flex-1 bg-[#1a1103] relative min-h-0">
                {chapterLocked ? (
                  // Gorgeous Locking Screen for Guest Restrictions
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#251509] to-[#120701]">
                    <div className="w-16 h-16 rounded-full bg-yellow-600/10 flex items-center justify-center text-yellow-600 text-3xl border border-yellow-600/30 mb-4 animate-pulse">
                      🔒
                    </div>
                    <h4 className="font-serif text-2xl font-bold text-[#d4a574] mb-3">Chapter Early Access Lock</h4>
                    <p className="font-sans text-sm text-coffee-300 max-w-md leading-relaxed mb-6">
                      {lockMessage}
                    </p>
                    <button
                      onClick={() => {
                        setActiveChapter(null)
                        setAuthOpen(true)
                      }}
                      className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#d4a574] to-[#c08040] text-espresso font-sans text-sm font-semibold uppercase tracking-wider hover:scale-105 transition-transform"
                    >
                      Login to Read Immediately
                    </button>
                  </div>
                ) : pdfLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#111]">
                    <div className="flex flex-col items-center gap-3 text-coffee-300 font-sans text-xs">
                      <div className="h-10 w-10 rounded-full border-2 border-[#d4a574]/30 border-t-[#d4a574] animate-spin" />
                      <span>Loading PDF...</span>
                    </div>
                  </div>
                ) : pdfError ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#111] p-8">
                    <div className="max-w-sm rounded-xl border border-red-900/40 bg-red-950/20 p-5 text-center">
                      <h4 className="font-serif text-lg font-bold text-red-300 mb-2">PDF unavailable</h4>
                      <p className="font-sans text-xs leading-relaxed text-coffee-300">{pdfError}</p>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-[#111]">
                    <object
                      data={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                      type="application/pdf"
                      className="hidden md:block w-full h-full border-none"
                      aria-label={activeChapter.title}
                    >
                      <iframe
                        src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                        className="w-full h-full border-none"
                        title={activeChapter.title}
                      />
                    </object>
                    <div className="md:hidden h-full flex flex-col">
                      <iframe
                        src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                        className="flex-1 w-full border-none bg-white"
                        title={activeChapter.title}
                      />
                      <div className="shrink-0 flex items-center justify-between gap-3 border-t border-coffee-900 bg-coffee-950/95 px-4 py-3">
                        <span className="font-sans text-[11px] text-coffee-400 leading-tight">
                          If your browser shows a PDF card, open it directly for the best mobile reading view.
                        </span>
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-lg px-4 py-2 font-sans text-xs font-bold text-espresso bg-yellow-600"
                        >
                          Open PDF
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Hand: Comments & Review Tabs */}
            <div className="w-full md:w-96 flex-1 md:h-full min-h-0 flex flex-col bg-coffee-950/40">
              
              {/* Tab Header Selector */}
              <div className="flex border-b border-coffee-900 bg-coffee-950 items-center justify-between">
                <h3 className="py-4 px-4 font-sans text-xs font-bold uppercase tracking-wider text-[#d4a574]">
                  Discussions & Reviews ({feed.length})
                </h3>
                <button 
                  onClick={() => setActiveChapter(null)}
                  className="hidden md:block px-5 text-2xl text-coffee-400 hover:text-coffee-200"
                >
                  &times;
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                <div className="space-y-4 flex flex-col h-full">
                  {/* Chapter Rating Summary */}
                  <div className="p-4 rounded-2xl border border-coffee-950 bg-coffee-950/80 text-center shrink-0">
                    <div className="text-2xl font-serif font-black text-yellow-400">
                      {averageRating > 0 ? `★ ${averageRating}` : '★ 0.0'}
                    </div>
                    <div className="font-sans text-[10px] text-coffee-400 uppercase tracking-widest mt-1">
                      Chapter Average Review
                    </div>
                  </div>

                  {/* Add Discussion Form */}
                  {user ? (
                    <form onSubmit={handleAddDiscussion} className="space-y-3 shrink-0 p-3 rounded-xl border border-coffee-900 bg-coffee-950/40">
                      <div className="flex items-center justify-between">
                        <label className="font-sans text-xs text-coffee-300">
                          {newRating > 0 ? 'Writing Review' : 'Writing Comment'}
                        </label>
                        <div className="flex items-center gap-1 group">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setNewRating(newRating === star ? 0 : star)}
                              className="text-base transition-transform active:scale-95 text-yellow-500"
                              title="Click again to clear rating (makes it a comment)"
                              disabled={userHasTopLevelDiscussion}
                            >
                              {star <= newRating ? '★' : '☆'}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {userHasTopLevelDiscussion ? (
                        <div className="w-full p-3 rounded-xl font-sans text-xs border border-red-900/30 bg-red-900/10 text-red-400 text-center">
                          You have already posted on this chapter. You can still reply to comments.
                        </div>
                      ) : (
                        <>
                          <textarea
                            rows={2}
                            required={newRating === 0}
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder={newRating > 0 ? "Write your review (optional)..." : "Write a public comment..."}
                            className="w-full p-3 rounded-xl font-sans text-xs outline-none border focus:border-yellow-600 transition-colors"
                            style={{
                              background: 'rgba(26, 15, 0, 0.4)',
                              borderColor: 'rgba(212, 165, 116, 0.15)',
                              color: '#F5E6D3'
                            }}
                          />
                          <button
                            type="submit"
                            className="w-full py-2 rounded-lg font-sans font-semibold text-xs text-espresso transition-all hover:scale-[1.02]"
                            style={{ background: 'linear-gradient(135deg, #d4a574, #c08040)' }}
                          >
                            {newRating > 0 ? 'Submit Review' : 'Post Comment'}
                          </button>
                        </>
                      )}
                    </form>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-coffee-800 text-center font-sans text-xs text-coffee-400 shrink-0 bg-coffee-950/20">
                      Please <button onClick={() => setAuthOpen(true)} className="text-yellow-600 hover:underline font-semibold">sign in</button> to comment or review.
                    </div>
                  )}

                  {/* Combined List */}
                  <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                    {feed.length === 0 ? (
                      <p className="text-center text-xs text-coffee-500 font-sans py-8">No discussions on this chapter yet.</p>
                    ) : (
                      feed.map(item => (
                        <div key={item._id} className="p-3 rounded-xl border border-coffee-900 bg-coffee-950/50 flex flex-col gap-2">
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-sans text-xs font-bold text-coffee-200">{item.userName}</span>
                              {item.isReview && (
                                <span className="text-yellow-500 font-bold text-[10px]">{'★'.repeat(item.rating)}</span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-coffee-500">{new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                          {(item.content || item.comment) && (
                            <p className="font-sans text-xs text-coffee-300 leading-relaxed whitespace-pre-wrap">
                              {item.content || item.comment}
                            </p>
                          )}
                          
                          {/* Replies Section for Comments */}
                          {!item.isReview && (
                            <div className="mt-2 pl-3 border-l-2 border-coffee-800/50 flex flex-col gap-2">
                              {item.replies && item.replies.map(reply => (
                                <div key={reply._id} className="text-xs font-sans text-coffee-300 bg-coffee-900/20 p-2 rounded-lg">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-coffee-200">{reply.userName}</span>
                                    <span className="text-[9px] text-coffee-500 font-mono">{new Date(reply.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <p>{reply.content}</p>
                                </div>
                              ))}
                              
                              {/* Reply Input or Toggle Button */}
                              {user ? (
                                replyingTo === item._id ? (
                                  <form onSubmit={(e) => handleReply(e, item._id)} className="flex gap-2 mt-1">
                                    <input 
                                      type="text" 
                                      required
                                      autoFocus
                                      value={replyContent}
                                      onChange={(e) => setReplyContent(e.target.value)}
                                      placeholder="Write a reply..."
                                      className="flex-1 px-2 py-1.5 rounded-lg font-sans text-xs outline-none border focus:border-yellow-600 transition-colors bg-black/40 text-[#F5E6D3]"
                                      style={{ borderColor: 'rgba(212, 165, 116, 0.15)' }}
                                    />
                                    <button type="submit" className="px-3 py-1.5 rounded-lg text-xs font-bold text-espresso transition-transform hover:scale-105"
                                      style={{ background: 'linear-gradient(135deg, #d4a574, #c08040)' }}>
                                      Post
                                    </button>
                                    <button type="button" onClick={() => {setReplyingTo(null); setReplyContent('')}} className="text-xs text-coffee-400 hover:text-coffee-200">
                                      Cancel
                                    </button>
                                  </form>
                                ) : (
                                  <button onClick={() => setReplyingTo(item._id)} className="flex items-center gap-1.5 text-[10px] text-yellow-600 font-bold uppercase tracking-wider text-left hover:text-yellow-500 transition-colors w-max mt-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="9 17 4 12 9 7"></polyline>
                                      <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
                                    </svg>
                                    Reply to this
                                  </button>
                                )
                              ) : null}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Auth Modal portal link */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
