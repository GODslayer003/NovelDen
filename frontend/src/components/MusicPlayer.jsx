import React, { useRef, useState, useEffect } from 'react';
import { STATIC_URL } from '../utils/api';

export default function MusicPlayer({ musicUrl }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.play().catch(e => console.log('Autoplay prevented:', e));
    }
  }, [isPlaying]);

  // Autoplay on mount? User requested "we can hear as we go to their profile"
  // Note: Modern browsers block autoplay unless muted, so we'll try and fallback to manual play
  useEffect(() => {
    setIsPlaying(true);
  }, []);

  if (!musicUrl) return null;

  return (
    <div className="bg-espresso/80 backdrop-blur border border-coffee-800 p-4 rounded-xl flex items-center gap-4 w-full max-w-sm">
      <audio ref={audioRef} src={`${STATIC_URL}${musicUrl}`} loop />
      <button 
        onClick={() => {
          if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
          } else {
            audioRef.current.play();
            setIsPlaying(true);
          }
        }}
        className="w-12 h-12 flex-shrink-0 bg-yellow-600 rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform shadow-lg"
      >
        {isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
        ) : (
          <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        )}
      </button>
      <div className="flex-1 overflow-hidden">
        <p className="text-xs text-yellow-600 font-bold uppercase tracking-wider mb-1">Now Playing</p>
        <p className="text-coffee-100 text-sm font-semibold truncate animate-pulse">Writer's Theme</p>
      </div>
    </div>
  );
}
