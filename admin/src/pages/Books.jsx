import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;
const STATIC_URL = import.meta.env.VITE_STATIC_URL;

export default function Books() {
  const [books, setBooks] = useState([]);
  const [writers, setWriters] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const getHeaders = () => {
    const token = localStorage.getItem('novelden_admin_token');
    return { headers: { Authorization: token ? `Bearer ${token}` : '' } };
  };

  const [addBookOpen, setAddBookOpen] = useState(false);
  const [manageChaptersOpen, setManageChaptersOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  // Add Book Form state
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newWriterId, setNewWriterId] = useState('');
  const [newGenre, setNewGenre] = useState('Fantasy');
  const [newDesc, setNewDesc] = useState('');
  const [newStatus, setNewStatus] = useState('Ongoing');
  const [newSeason, setNewSeason] = useState('1');
  const [newFeatured, setNewFeatured] = useState(false);
  const [newTrend, setNewTrend] = useState('None');
  const [newCover, setNewCover] = useState(null);

  // Manage Chapters state
  const [chapters, setChapters] = useState([]);
  const [newChapTitle, setNewChapTitle] = useState('');
  const [newChapType, setNewChapType] = useState('chapter');
  const [newChapOrder, setNewChapOrder] = useState('1.0');
  const [newChapPdf, setNewChapPdf] = useState(null);
  const [uploadingChapter, setUploadingChapter] = useState(false);

  const fetchData = async () => {
    try {
      const userStr = localStorage.getItem('novelden_admin_user');
      const user = userStr ? JSON.parse(userStr) : null;
      const queryParams = user && user.role === 'admin' ? `?uploadedBy=${user.id}` : '';
      
      const [booksRes, writersRes] = await Promise.all([
        axios.get(`${API_URL}/books${queryParams}`),
        axios.get(`${API_URL}/writers`)
      ]);
      setBooks(booksRes.data);
      setWriters(writersRes.data);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddBookSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle || !newDesc) return toast.error('Please fill in required fields');

    const formData = new FormData();
    formData.append('title', newTitle);
    formData.append('author', newAuthor);
    if (newWriterId) formData.append('writerId', newWriterId);
    
    const userStr = localStorage.getItem('novelden_admin_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      formData.append('uploadedBy', user.id);
    }
    
    formData.append('genre', newGenre);
    formData.append('description', newDesc);
    formData.append('status', newStatus);
    formData.append('season', newSeason);
    formData.append('featured', newFeatured);
    formData.append('trend', newTrend);
    if (newCover) formData.append('coverImage', newCover);

    try {
      await axios.post(`${API_URL}/books`, formData, {
        headers: { ...getHeaders().headers, 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Book created successfully!');
      setAddBookOpen(false);
      fetchData();
      
      // Reset form
      setNewTitle(''); setNewAuthor(''); setNewWriterId(''); setNewGenre('Fantasy');
      setNewDesc(''); setNewStatus('Ongoing'); setNewSeason('1'); setNewFeatured(false);
      setNewTrend('None'); setNewCover(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add book');
    }
  };

  const openManageChapters = async (book) => {
    setSelectedBook(book);
    setManageChaptersOpen(true);
    try {
      const res = await axios.get(`${API_URL}/books/${book._id}`);
      setChapters(res.data.chapters || []);
      const existing = res.data.chapters || [];
      if (existing.length > 0) {
        const maxOrder = Math.max(...existing.map(c => c.order));
        setNewChapOrder((maxOrder + 1.0).toFixed(1));
      } else {
        setNewChapOrder('1.0');
      }
    } catch (err) {
      toast.error('Failed to load chapters for book');
    }
  };

  const handleAddChapterSubmit = async (e) => {
    e.preventDefault();
    if (!newChapTitle || !newChapPdf || !newChapOrder) return toast.error('Please fill in all fields');

    const maxBytes = 20 * 1024 * 1024;
    if (newChapPdf.size > maxBytes) return toast.error('PDF exceeds 20MB limit');

    setUploadingChapter(true);
    const formData = new FormData();
    formData.append('title', newChapTitle);
    formData.append('type', newChapType);
    formData.append('order', newChapOrder);
    formData.append('pdfFile', newChapPdf);

    try {
      await axios.post(`${API_URL}/books/${selectedBook._id}/chapters`, formData, {
        headers: { ...getHeaders().headers, 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Chapter uploaded successfully!');
      
      const res = await axios.get(`${API_URL}/books/${selectedBook._id}`);
      setChapters(res.data.chapters || []);
      const existing = res.data.chapters || [];
      const maxOrder = Math.max(...existing.map(c => c.order));
      setNewChapOrder((maxOrder + 1.0).toFixed(1));
      
      setNewChapTitle('');
      setNewChapPdf(null);
      document.getElementById('pdfInput').value = '';
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload chapter');
    } finally {
      setUploadingChapter(false);
    }
  };

  const handleDeleteBook = async (id) => {
    if (!window.confirm('Delete this book?')) return;
    try {
      await axios.delete(`${API_URL}/books/${id}`, getHeaders());
      toast.success('Book deleted');
      fetchData();
    } catch (err) {
      toast.error('Error deleting book');
    }
  };

  const filtered = books.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    (b.author || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.writerId?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif font-black text-4xl text-gradient"
              style={{ background: 'linear-gradient(135deg, #F5E6D3, #d4a574)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Book Management
          </h1>
          <p className="text-xs text-coffee-400 font-sans mt-1">Add, update, and manage story chapters.</p>
        </div>
        <button onClick={() => setAddBookOpen(true)} className="px-5 py-3 rounded-xl font-sans text-xs font-bold text-espresso hover:scale-105 transition-transform" style={{ background: 'linear-gradient(135deg, #d4a574, #c08040)' }}>
          + Add Book
        </button>
      </div>

      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search books..."
        className="mb-6 w-full max-w-sm px-4 py-3 rounded-xl font-sans text-sm outline-none border transition-colors bg-espresso/40 text-coffee-100 border-coffee-800 focus:border-yellow-600"
      />

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-600" /></div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-coffee-800 bg-coffee-950/20">
          <table className="w-full font-sans text-sm text-left">
            <thead>
              <tr className="bg-espresso/80 border-b border-coffee-800">
                {['Cover', 'Title', 'Writer/Author', 'Genre', 'Status', 'Chapters', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-4 text-coffee-400 font-medium text-xs tracking-wider uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-coffee-900/30">
              {filtered.map(b => (
                <tr key={b._id} className="hover:bg-coffee-900/10">
                  <td className="px-5 py-3">
                    {(b.coverImage || b.cover) && (
                      <img
                        src={((b.coverImage || b.cover).startsWith('http')) ? (b.coverImage || b.cover) : `${STATIC_URL}${b.coverImage || b.cover}`}
                        alt=""
                        className="w-10 h-14 object-cover rounded-lg border border-coffee-800"
                      />
                    )}
                  </td>
                  <td className="px-5 py-3 font-semibold text-coffee-100">{b.title} {b.featured && '⭐'}</td>
                  <td className="px-5 py-3 text-coffee-300">{b.writerId ? b.writerId.name : b.author}</td>
                  <td className="px-5 py-3 text-coffee-400">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-coffee-900 border border-coffee-800">{b.genre}</span>
                  </td>
                  <td className="px-5 py-3 text-coffee-300 capitalize">{b.status}</td>
                  <td className="px-5 py-3 text-coffee-300">{b.chapters?.length || 0}</td>
                  <td className="px-5 py-3 flex gap-2 items-center h-full mt-2">
                    <button onClick={() => openManageChapters(b)} className="text-xs text-yellow-600 font-semibold hover:underline">Manage Chapters</button>
                    <button onClick={() => handleDeleteBook(b._id)} className="text-xs text-red-500 font-semibold hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Book Modal */}
      {addBookOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setAddBookOpen(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 rounded-3xl border border-coffee-800 bg-espresso">
            <h3 className="font-serif text-2xl font-bold text-coffee-100 mb-6">Create New Book</h3>
            <form onSubmit={handleAddBookSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-coffee-400 mb-1">Title *</label>
                  <input type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-black/50 border border-coffee-800 rounded-lg px-3 py-2 text-coffee-100" />
                </div>
                <div>
                  <label className="block text-xs uppercase text-coffee-400 mb-1">Writer Profile</label>
                  <select value={newWriterId} onChange={e => setNewWriterId(e.target.value)} className="w-full bg-black/50 border border-coffee-800 rounded-lg px-3 py-2 text-coffee-100">
                    <option value="">-- No Linked Writer --</option>
                    {writers.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-coffee-400 mb-1">Custom Author Name (if no Writer Profile)</label>
                  <input type="text" value={newAuthor} onChange={e => setNewAuthor(e.target.value)} className="w-full bg-black/50 border border-coffee-800 rounded-lg px-3 py-2 text-coffee-100" />
                </div>
                <div>
                  <label className="block text-xs uppercase text-coffee-400 mb-1">Genre *</label>
                  <select value={newGenre} onChange={e => setNewGenre(e.target.value)} className="w-full bg-black/50 border border-coffee-800 rounded-lg px-3 py-2 text-coffee-100">
                    {['Fantasy', 'Adventure', 'Romance', 'Sci-Fi', 'Mystery', 'Historical', 'Cyberpunk', 'Dark Fantasy'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs uppercase text-coffee-400 mb-1">Status</label>
                  <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full bg-black/50 border border-coffee-800 rounded-lg px-3 py-2 text-coffee-100">
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hiatus">On Hiatus</option>
                    <option value="Dropped">Dropped</option>
                    <option value="Season End">Season End</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase text-coffee-400 mb-1">Season</label>
                  <input type="number" value={newSeason} onChange={e => setNewSeason(e.target.value)} className="w-full bg-black/50 border border-coffee-800 rounded-lg px-3 py-2 text-coffee-100" />
                </div>
                <div>
                  <label className="block text-xs uppercase text-coffee-400 mb-1">Trend Badge</label>
                  <select value={newTrend} onChange={e => setNewTrend(e.target.value)} className="w-full bg-black/50 border border-coffee-800 rounded-lg px-3 py-2 text-coffee-100">
                    <option value="None">None</option>
                    <option value="Hot">Hot</option>
                    <option value="New">New</option>
                    <option value="Rising">Rising</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-coffee-100 cursor-pointer">
                  <input type="checkbox" checked={newFeatured} onChange={e => setNewFeatured(e.target.checked)} />
                  Featured Book
                </label>
              </div>
              <div>
                <label className="block text-xs uppercase text-coffee-400 mb-1">Description *</label>
                <textarea rows={3} required value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full bg-black/50 border border-coffee-800 rounded-lg px-3 py-2 text-coffee-100" />
              </div>
              <div>
                <label className="block text-xs uppercase text-coffee-400 mb-1">Cover Image</label>
                <input type="file" accept="image/*" onChange={e => setNewCover(e.target.files[0])} className="w-full text-sm text-coffee-400" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setAddBookOpen(false)} className="flex-1 py-3 bg-coffee-800 text-coffee-100 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-yellow-600 text-black rounded-xl font-bold">Save Book</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Chapters Modal */}
      {manageChaptersOpen && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setManageChaptersOpen(false)} />
          <div className="relative w-full max-w-4xl h-[85vh] flex flex-col rounded-3xl border border-coffee-800 bg-espresso">
            <div className="p-6 border-b border-coffee-900 flex justify-between items-center bg-coffee-950/40">
              <div><h3 className="font-serif text-2xl font-bold text-coffee-100">Managing: {selectedBook.title}</h3></div>
              <button onClick={() => setManageChaptersOpen(false)} className="text-2xl text-coffee-400 hover:text-coffee-200">&times;</button>
            </div>
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Upload Form */}
              <div className="w-full md:w-96 p-6 border-r border-coffee-900 overflow-y-auto">
                <h4 className="font-serif text-lg font-bold text-yellow-600 mb-4">Upload New Document</h4>
                <form onSubmit={handleAddChapterSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase text-coffee-400 mb-1">Document Title *</label>
                    <input type="text" required value={newChapTitle} onChange={e => setNewChapTitle(e.target.value)} className="w-full bg-black/50 border border-coffee-800 rounded-lg px-3 py-2 text-coffee-100" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase text-coffee-400 mb-1">Type *</label>
                      <select value={newChapType} onChange={e => setNewChapType(e.target.value)} className="w-full bg-black/50 border border-coffee-800 rounded-lg px-3 py-2 text-coffee-100">
                        <option value="chapter">Chapter</option><option value="teaser">Teaser</option>
                        <option value="prequel">Prequel</option><option value="sequel">Sequel</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-coffee-400 mb-1">Order *</label>
                      <input type="number" step="0.1" required value={newChapOrder} onChange={e => setNewChapOrder(e.target.value)} className="w-full bg-black/50 border border-coffee-800 rounded-lg px-3 py-2 text-coffee-100" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-coffee-400 mb-1">Upload PDF File *</label>
                    <input id="pdfInput" type="file" required accept="application/pdf" onChange={e => setNewChapPdf(e.target.files[0])} className="w-full text-sm text-coffee-400" />
                  </div>
                  <button type="submit" disabled={uploadingChapter} className="w-full py-3 bg-yellow-600 text-black font-bold rounded-xl disabled:opacity-50">
                    {uploadingChapter ? 'Uploading...' : 'Publish Document'}
                  </button>
                </form>
              </div>
              {/* Chapters List */}
              <div className="flex-1 p-6 overflow-y-auto space-y-3">
                <h4 className="font-serif text-lg font-bold text-yellow-600 mb-4">Existing Chapters</h4>
                {chapters.length === 0 ? <p className="text-coffee-400 text-center py-10">No chapters yet</p> : chapters.map(c => (
                  <div key={c._id} className="p-4 rounded-xl border border-coffee-900 bg-coffee-950/30 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-coffee-400 border border-coffee-900 px-2 py-0.5 rounded">Order {c.order}</span>
                      <span className="text-[10px] text-yellow-600 ml-2 uppercase border border-yellow-600/30 px-2 py-0.5 rounded">{c.type}</span>
                      <h5 className="text-sm font-semibold text-coffee-100 mt-1">{c.title}</h5>
                    </div>
                    <a href={(c.pdfUrl || '').startsWith('http') ? c.pdfUrl : `${STATIC_URL}${c.pdfUrl}`} target="_blank" rel="noreferrer" className="text-xs text-yellow-600 hover:underline">View PDF</a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}