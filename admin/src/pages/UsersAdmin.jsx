import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_URL } from '../config/api';

export default function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, verified: 0, unverified: 0, admins: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/users?search=${encodeURIComponent(search)}`);
      setUsers(res.data);
    } catch (err) {
      toast.error('Failed to load users');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/users/stats`);
      setStats(res.data);
    } catch (err) {}
  };

  useEffect(() => {
    Promise.all([fetchUsers(), fetchStats()]).finally(() => setLoading(false));
  }, [search]);

  const handleDelete = async (id, role) => {
    if (role === 'admin') {
      toast.error('Cannot delete admin accounts');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await axios.delete(`${API_URL}/users/${id}`);
      toast.success('User deleted');
      fetchUsers();
      fetchStats();
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif font-black text-4xl text-gradient"
              style={{ background: 'linear-gradient(135deg, #F5E6D3, #d4a574)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            User Accounts
          </h1>
          <p className="text-coffee-400 font-sans mt-2">Manage readers and administrators on Novel Den.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: stats.total, color: '#d4a574' },
          { label: 'Verified', value: stats.verified, color: '#4ade80' },
          { label: 'Unverified', value: stats.unverified, color: '#f87171' },
          { label: 'Admins', value: stats.admins, color: '#a78bfa' }
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl bg-black/40 border" style={{ borderColor: 'rgba(212,165,116,0.1)' }}>
            <div className="text-3xl font-black font-serif mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs font-sans text-coffee-400 uppercase tracking-widest">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex gap-4">
        <input 
          type="text" 
          placeholder="Search users by name or email..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl bg-black/40 border outline-none font-sans text-sm focus:border-yellow-600 transition-colors text-coffee-100"
          style={{ borderColor: 'rgba(212,165,116,0.15)' }}
        />
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border overflow-hidden bg-black/40" style={{ borderColor: 'rgba(212,165,116,0.1)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-sm whitespace-nowrap">
            <thead className="bg-[#2C1810]">
              <tr className="text-coffee-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-coffee-900/40">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-coffee-400">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-coffee-400">No users found.</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u._id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-coffee-800 flex items-center justify-center font-bold text-coffee-200">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-coffee-100">{u.name}</div>
                          <div className="text-xs text-coffee-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        u.role === 'admin' ? 'bg-purple-900/30 text-purple-400 border border-purple-800/30' : 'bg-coffee-900/50 text-coffee-400 border border-coffee-800/50'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        u.isVerified ? 'bg-green-900/30 text-green-400 border border-green-800/30' : 'bg-red-900/30 text-red-400 border border-red-800/30'
                      }`}>
                        {u.isVerified ? 'Verified' : 'Pending OTP'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-coffee-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.role !== 'admin' && (
                        <button 
                          onClick={() => handleDelete(u._id, u.role)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 border border-red-900/30 hover:bg-red-900/20 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
