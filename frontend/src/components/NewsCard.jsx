import React from 'react';
import { STATIC_URL } from '../utils/api';
import { Link } from 'react-router-dom';

export default function NewsCard({ news }) {
  const { title, content, mediaUrl, mediaType, writerId, createdAt } = news;

  return (
    <div className="bg-espresso/60 border border-coffee-800 rounded-2xl overflow-hidden hover:border-yellow-600/50 transition-colors">
      {mediaUrl && mediaType === 'image' && (
        <img src={`${STATIC_URL}${mediaUrl}`} alt={title} className="w-full h-64 object-cover" />
      )}
      {mediaUrl && mediaType === 'video' && (
        <video src={`${STATIC_URL}${mediaUrl}`} controls className="w-full max-h-64 object-cover bg-black" />
      )}
      {mediaUrl && mediaType === 'music' && (
        <div className="p-4 bg-black/40">
          <audio src={`${STATIC_URL}${mediaUrl}`} controls className="w-full" />
        </div>
      )}
      <div className="p-6">
        <h3 className="font-serif font-bold text-2xl text-coffee-100 mb-2">{title}</h3>
        
        <div className="flex items-center gap-3 mb-4">
          <Link to={`/writer/${writerId?._id}`} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-coffee-800">
              {writerId?.avatarUrl ? (
                <img src={`${STATIC_URL}${writerId.avatarUrl}`} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold">{writerId?.name?.[0] || '?'}</div>
              )}
            </div>
            <span className="text-sm text-yellow-600 font-semibold group-hover:underline">{writerId?.name || 'Unknown Writer'}</span>
          </Link>
          <span className="text-coffee-600 text-sm">•</span>
          <span className="text-coffee-400 text-sm">{new Date(createdAt).toLocaleDateString()}</span>
        </div>

        <p className="text-coffee-300 whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
