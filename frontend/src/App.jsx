import React, { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import LoadingScreen from './components/LoadingScreen'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Story from './pages/Story'
import Writers from './pages/Writers'
import TopRated from './pages/TopRated'
import WriterProfile from './pages/WriterProfile'
import NewsFeed from './pages/NewsFeed'
import Profile from './pages/Profile'

export default function App() {
  const [loading, setLoading] = useState(true)

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#3d2314', color: '#F5E6D3', border: '1px solid #6F4E37' }
        }}
      />
      {loading ? (
        <LoadingScreen onComplete={() => setLoading(false)} />
      ) : (
        <>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/story/:id" element={<Story />} />
            <Route path="/writers" element={<Writers />} />
            <Route path="/writer/:id" element={<WriterProfile />} />
            <Route path="/top-rated" element={<TopRated />} />
            <Route path="/news" element={<NewsFeed />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </>
      )}
    </>
  )
}