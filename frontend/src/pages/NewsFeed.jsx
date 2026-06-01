import React, { useEffect, useState } from 'react';
import { getNews } from '../utils/api';
import NewsCard from '../components/NewsCard';
import SectionHeader from '../components/SectionHeader';

export default function NewsFeed() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNews().then(res => setNews(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#1a0f00] pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <SectionHeader 
          eyebrow="Latest Updates"
          title="News & Announcements"
          subtitle="Stay up to date with your favorite authors and platform events."
        />
        
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-600"></div></div>
        ) : news.length === 0 ? (
          <div className="text-center text-coffee-400 py-20">No announcements yet.</div>
        ) : (
          <div className="space-y-8 mt-12">
            {news.map(item => <NewsCard key={item._id} news={item} />)}
          </div>
        )}
      </div>
    </div>
  );
}
