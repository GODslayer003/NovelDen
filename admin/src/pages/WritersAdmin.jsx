import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_URL, STATIC_URL } from '../config/api';

export default function WritersAdmin() {
  const [writers, setWriters] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({ name: '', genre: '', bio: '', featured: false, email: '', password: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [musicFile, setMusicFile] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const fetchWriters = async () => {
    try {
      const res = await axios.get(`${API_URL}/writers`);
      setWriters(res.data);
    } catch (err) {
      toast.error('Failed to load writers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWriters(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('name', formData.name);
    data.append('genre', formData.genre);
    data.append('bio', formData.bio);
    data.append('featured', formData.featured);
    data.append('email', formData.email);
    if (formData.password) data.append('password', formData.password);
    if (avatarFile) data.append('avatar', avatarFile);
    if (musicFile) data.append('music', musicFile);

    try {
      if (editingId) {
        await axios.put(`${API_URL}/writers/${editingId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Writer updated');
      } else {
        await axios.post(`${API_URL}/writers`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Writer created');
      }
      setFormData({ name: '', genre: '', bio: '', featured: false, email: '', password: '' });
      setAvatarFile(null);
      setMusicFile(null);
      setEditingId(null);
      fetchWriters();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving writer');
    }
  };

  const handleEdit = (w) => {
    setFormData({ name: w.name, genre: w.genre, bio: w.bio, featured: w.featured, email: w.email || '', password: '' });
    setEditingId(w._id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this writer?')) return;
    try {
      await axios.delete(`${API_URL}/writers/${id}`);
      toast.success('Writer deleted');
      fetchWriters();
    } catch (err) {
      toast.error('Error deleting writer');
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="font-serif font-bold text-3xl mb-8" style={{ color: '#d4a574' }}>Manage Writers</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-espresso/40 p-6 rounded-2xl border border-coffee-800">
            <h2 className="font-serif text-xl mb-4 text-coffee-100">{editingId ? 'Edit Writer' : 'Add New Writer'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-coffee-400 mb-1">Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/50 border border-coffee-800 rounded-lg px-3 py-2 text-coffee-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-coffee-400 mb-1">Admin Email (Login)</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-black/50 border border-coffee-800 rounded-lg px-3 py-2 text-coffee-100" placeholder="writer@novelden.com" />
                </div>
                <div>
                  <label className="block text-xs uppercase text-coffee-400 mb-1">{editingId ? 'New Password (Optional)' : 'Password (Login)'}</label>
                  <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-black/50 border border-coffee-800 rounded-lg px-3 py-2 text-coffee-100" placeholder="••••••••" />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase text-coffee-400 mb-1">Genre</label>
                <input type="text" value={formData.genre} onChange={e => setFormData({...formData, genre: e.target.value})} className="w-full bg-black/50 border border-coffee-800 rounded-lg px-3 py-2 text-coffee-100" />
              </div>
              <div>
                <label className="block text-xs uppercase text-coffee-400 mb-1">Bio</label>
                <textarea rows="3" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full bg-black/50 border border-coffee-800 rounded-lg px-3 py-2 text-coffee-100" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={formData.featured} onChange={e => setFormData({...formData, featured: e.target.checked})} id="featured-writer" />
                <label htmlFor="featured-writer" className="text-sm text-coffee-100">Featured Writer</label>
              </div>
              <div>
                <label className="block text-xs uppercase text-coffee-400 mb-1">Avatar Image</label>
                <input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files[0])} className="w-full text-sm text-coffee-400" />
              </div>
              <div>
                <label className="block text-xs uppercase text-coffee-400 mb-1">Profile Music (Audio)</label>
                <input type="file" accept="audio/*" onChange={e => setMusicFile(e.target.files[0])} className="w-full text-sm text-coffee-400" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-lg">{editingId ? 'Update' : 'Add'}</button>
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); setFormData({name:'', genre:'', bio:'', featured:false, email:'', password:''}); }} className="px-4 bg-coffee-800 text-white rounded-lg">Cancel</button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          {loading ? <p>Loading...</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {writers.map(w => (
                <div key={w._id} className="rounded-2xl p-5 flex items-center gap-4 bg-espresso/60 border border-coffee-800">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-coffee-900 flex-shrink-0">
                    {(w.avatar || w.avatarUrl) ? (
                      <img
                        src={(w.avatar || w.avatarUrl).startsWith('http') ? (w.avatar || w.avatarUrl) : `${STATIC_URL}${w.avatar || w.avatarUrl}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xl">{w.name[0]}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-sans font-bold text-coffee-100">{w.name} {w.featured && '⭐'}</div>
                    <div className="text-xs text-coffee-400">{w.genre}</div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => handleEdit(w)} className="text-xs text-yellow-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(w._id)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
