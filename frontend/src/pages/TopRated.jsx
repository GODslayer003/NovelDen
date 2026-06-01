import React, { useState, useEffect } from 'react'
import { getBooks } from '../utils/api'
import SectionHeader from '../components/SectionHeader'
import TopRatedCard from '../components/TopRatedCard'

export default function TopRated() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBooks().then(res => {
      const top = res.data.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10)
      setBooks(top)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen pt-24 pb-20 px-6" style={{ background: '#1a0f00' }}>
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          eyebrow="Reader's Choice"
          title="Top Rated Stories"
          subtitle="The highest-rated stories on Novel Den, chosen by millions of readers."
        />
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#d4a574]" /></div>
        ) : (
          <div className="flex flex-col gap-6">
            {books.map((b, i) => <TopRatedCard key={b._id} book={{ ...b, rank: i + 1 }} index={i} />)}
          </div>
        )}
      </div>
    </div>
  )
}