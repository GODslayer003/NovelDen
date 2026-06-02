import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_URL, STATIC_URL } from '../config/api';

export default function NewsAdmin() {
  const [news, setNews] = useState([]);
  const [writers, setWriters] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    writerId: '',
    title: '',
    content: ''
  });
  const [mediaFile, setMediaFile] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [newsRes, writersRes] = await Promise.all([
        axios.get(`${API_URL}/news`),
        axios.get(`${API_URL}/writers`)
      ]);
      setNews(newsRes.data);
      setWriters(writersRes.data);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('writerId', formData.writerId);
    data.append('title', formData.title);
    data.append('content', formData.content);
    if (mediaFile) {
      data.append('media', mediaFile);
    }

    try {
      await axios.post(`${API_URL}/news`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Announcement posted!');
      setFormData({ writerId: '', title: '', content: '' });
      setMediaFile(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error posting news');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await axios.delete(`${API_URL}/news/${id}`);
      toast.success('Announcement deleted');
      fetchData();
    } catch (err) {
      toast.error('Error deleting announcement');
    }
  };

  if (loading) return <div className="text-coffee-200">Loading...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="font-serif font-bold text-3xl text-coffee-100" style={{ color: '#d4a574' }}>News & Announcements</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-espresso/40 p-6 rounded-2xl border border-coffee-800">
            <h2 className="font-serif text-xl mb-4 text-coffee-100">Post Announcement</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-coffee-400 mb-1">Writer</label>
                <select 
                  required
                  value={formData.writerId}
                  onChange={e => setFormData({...formData, writerId: e.target.value})}
                  className="w-full bg-black/50 border border-coffee-800 rounded-lg px-3 py-2 text-sm text-coffee-100 focus:border-yellow-600 outline-none"
                >
                  <option value="">Select Writer...</option>
                  {writers.map(w => (
                    <option key={w._id} value={w._id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase text-coffee-400 mb-1">Title</label>
                <input 
                  type="text" required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-black/50 border border-coffee-800 rounded-lg px-3 py-2 text-sm text-coffee-100 focus:border-yellow-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-coffee-400 mb-1">Content</label>
                <textarea 
                  required rows="4"
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  className="w-full bg-black/50 border border-coffee-800 rounded-lg px-3 py-2 text-sm text-coffee-100 focus:border-yellow-600 outline-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs uppercase text-coffee-400 mb-1">Media (Image/Video/Audio)</label>
                <input 
                  type="file" accept="image/*,video/*,audio/*"
                  onChange={e => setMediaFile(e.target.files[0])}
                  className="w-full text-sm text-coffee-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-yellow-600/20 file:text-yellow-600 hover:file:bg-yellow-600/30"
                />
              </div>

              <button type="submit" className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-xl transition-colors">
                Post Announcement
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {news.length === 0 ? (
            <p className="text-coffee-400">No announcements found.</p>
          ) : (
            news.map(item => (
              <div key={item._id} className="bg-espresso/40 p-5 rounded-2xl border border-coffee-800 flex gap-4">
                <div className="w-12 h-12 rounded-full bg-coffee-800 overflow-hidden flex-shrink-0">
                  {(item.writerId?.avatar || item.writerId?.avatarUrl) ? (
                    <img src={(item.writerId.avatar || item.writerId.avatarUrl).startsWith('http') ? (item.writerId.avatar || item.writerId.avatarUrl) : `${STATIC_URL}${item.writerId.avatar || item.writerId.avatarUrl}`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">✍️</div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-serif font-bold text-lg text-coffee-100">{item.title}</h3>
                      <p className="text-xs text-yellow-600 mb-2">By {item.writerId?.name || 'Unknown'} • {new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => handleDelete(item._id)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                  </div>
                  <p className="text-sm text-coffee-200 mb-3 whitespace-pre-wrap">{item.content}</p>
                  
                  {item.mediaUrl && item.mediaType === 'image' && (
                    <img src={(item.mediaUrl || '').startsWith('http') ? item.mediaUrl : `${STATIC_URL}${item.mediaUrl}`} alt="Attached" className="max-h-48 rounded-lg" />
                  )}
                  {item.mediaUrl && item.mediaType === 'video' && (
                    <video src={(item.mediaUrl || '').startsWith('http') ? item.mediaUrl : `${STATIC_URL}${item.mediaUrl}`} controls className="max-h-48 rounded-lg" />
                  )}
                  {item.mediaUrl && item.mediaType === 'music' && (
                    <audio src={(item.mediaUrl || '').startsWith('http') ? item.mediaUrl : `${STATIC_URL}${item.mediaUrl}`} controls className="w-full" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
