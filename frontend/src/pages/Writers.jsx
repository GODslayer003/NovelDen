import React, { useState, useEffect } from 'react'
import { getWriters } from '../utils/api'
import SectionHeader from '../components/SectionHeader'
import WriterCard from '../components/WriterCard'

export default function Writers() {
  const [writers, setWriters] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getWriters().then(res => setWriters(res.data)).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen pt-24 pb-20 px-6" style={{ background: '#1a0f00' }}>
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          eyebrow="The Voices"
          title="Our Writers"
          subtitle="Every story begins with a writer who dared to imagine. Meet them here."
        />
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#d4a574]" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {writers.map(w => <WriterCard key={w._id} writer={w} />)}
          </div>
        )}
      </div>
    </div>
  )
}