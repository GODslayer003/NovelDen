import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'

const stats = [
  { label: 'Total Books',   value: '1,284', icon: '📚', change: '+12%' },
  { label: 'Total Readers', value: '2.4M',  icon: '👁',  change: '+8%'  },
  { label: 'Active Writers',value: '856',   icon: '✍️',  change: '+5%'  },
  { label: 'Revenue',       value: '$18.4k',icon: '💰', change: '+22%' },
]

const reads = [
  { month: 'Jan', reads: 40 }, { month: 'Feb', reads: 68 },
  { month: 'Mar', reads: 55 }, { month: 'Apr', reads: 90 },
  { month: 'May', reads: 78 }, { month: 'Jun', reads: 112 },
]

export default function Dashboard() {
  return (
    <div>
      <h1 className="font-serif font-bold text-3xl mb-8" style={{ color: '#d4a574' }}>Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map(s => (
          <div
            key={s.label}
            className="rounded-2xl p-5"
            style={{ background: 'rgba(61,35,20,0.6)', border: '1px solid rgba(212,165,116,0.15)' }}
          >
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="font-serif font-bold text-2xl" style={{ color: '#F5E6D3' }}>{s.value}</div>
            <div className="font-sans text-xs text-coffee-400 mt-0.5">{s.label}</div>
            <div className="font-sans text-xs text-green-400 mt-2">{s.change} this month</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div
        className="rounded-2xl p-6"
        style={{ background: 'rgba(61,35,20,0.5)', border: '1px solid rgba(212,165,116,0.1)' }}
      >
        <h2 className="font-serif font-semibold text-xl mb-6" style={{ color: '#d4a574' }}>Monthly Reads (K)</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={reads}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,165,116,0.08)" />
            <XAxis dataKey="month" stroke="#6F4E37" tick={{ fill: '#9a7a6a', fontSize: 12 }} />
            <YAxis stroke="#6F4E37" tick={{ fill: '#9a7a6a', fontSize: 12 }} />
            <Tooltip contentStyle={{ background: '#2C1810', border: '1px solid #6F4E37', color: '#F5E6D3', borderRadius: 8 }} />
            <Line type="monotone" dataKey="reads" stroke="#d4a574" strokeWidth={2.5} dot={{ fill: '#d4a574', r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}