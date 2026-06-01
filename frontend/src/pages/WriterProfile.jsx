import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getWriter, STATIC_URL } from '../utils/api';
import MusicPlayer from '../components/MusicPlayer';
import BookCard from '../components/BookCard';
import SectionHeader from '../components/SectionHeader';

export default function WriterProfile() {
  const { id } = useParams();
  const [writer, setWriter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWriter(id).then(res => setWriter(res.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-[#1a0f00] flex justify-center items-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-600"></div></div>;
  }
  if (!writer) return <div className="min-h-screen bg-[#1a0f00] text-center pt-32 text-coffee-400">Writer not found.</div>;

  const totalViews = writer.books?.reduce((acc, b) => acc + (b.views || 0), 0) || 0;
  const avgRating = writer.books?.length ? (writer.books.reduce((acc, b) => acc + (b.rating || 0), 0) / writer.books.length).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-[#1a0f00] pb-20 relative overflow-hidden">
      {/* Absolute Cinema Background */}
      <div className="absolute inset-0 z-0 h-[80vh]">
        <img 
          src={writer.avatar ? `${STATIC_URL}${writer.avatar}` : 'https://i.pinimg.com/originals/46/96/88/469688385704ca1acde40f62c3edd322.gif'} 
          alt="bg" 
          className="w-full h-full object-cover opacity-20 blur-sm scale-110"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(26,15,0,0.5) 0%, rgba(26,15,0,0.9) 60%, rgba(26,15,0,1) 100%)' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32">
        <div className="flex flex-col md:flex-row gap-12 items-center md:items-start mb-20">
          <div className="w-48 h-48 md:w-64 md:h-64 flex-shrink-0 rounded-full overflow-hidden border-4 border-yellow-600/30 shadow-[0_0_50px_rgba(212,165,116,0.3)] bg-coffee-950">
            {writer.avatar ? (
              <img src={`${STATIC_URL}${writer.avatar}`} alt={writer.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-6xl text-yellow-600">{writer.name[0]}</div>
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-4 justify-center md:justify-start">
              <h1 className="font-serif font-black text-5xl md:text-7xl text-gradient" style={{ background: 'linear-gradient(135deg, #F5E6D3, #d4a574)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {writer.name}
              </h1>
              {writer.featured && <span className="bg-yellow-600/20 text-yellow-500 px-3 py-1 rounded-full text-xs font-bold border border-yellow-600/30 uppercase tracking-widest">Featured</span>}
            </div>
            
            <p className="text-xl text-yellow-600 font-sans tracking-wider uppercase font-semibold mb-6">{writer.genre}</p>
            
            <p className="text-coffee-300 text-lg max-w-2xl leading-relaxed mb-8">{writer.bio || 'A mysterious author crafting incredible tales in the Novel Den.'}</p>
            
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto md:mx-0 mb-8">
              <div className="bg-espresso/50 border border-coffee-800 rounded-xl p-4 text-center backdrop-blur">
                <div className="text-2xl font-black text-coffee-100">{writer.books?.length || 0}</div>
                <div className="text-xs uppercase text-coffee-400 font-bold mt-1">Works</div>
              </div>
              <div className="bg-espresso/50 border border-coffee-800 rounded-xl p-4 text-center backdrop-blur">
                <div className="text-2xl font-black text-coffee-100">{totalViews >= 1000 ? (totalViews/1000).toFixed(1)+'k' : totalViews}</div>
                <div className="text-xs uppercase text-coffee-400 font-bold mt-1">Reads</div>
              </div>
              <div className="bg-espresso/50 border border-coffee-800 rounded-xl p-4 text-center backdrop-blur">
                <div className="text-2xl font-black text-yellow-500">{avgRating}</div>
                <div className="text-xs uppercase text-coffee-400 font-bold mt-1">Avg Rating</div>
              </div>
            </div>

            {writer.profileMusic && <MusicPlayer musicUrl={writer.profileMusic} />}
          </div>
        </div>

        <SectionHeader eyebrow="Masterpieces" title={`Works by ${writer.name}`} subtitle="Dive into the imaginative worlds created by this author." />
        
        {writer.books?.length === 0 ? (
          <p className="text-coffee-400 text-center py-10">No works published yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {writer.books.map((book, i) => <BookCard key={book._id} book={{...book, author: writer.name}} index={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}
