'use client';
import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

interface DataPoint {
  checkedAt?: string;
  date?: string;
  playersOnline?: number;
  avgPlayers?: number;
  maxPlayers?: number;
  online?: boolean;
}

interface ServerChartProps {
  data: DataPoint[];
  range: '24h' | '7d' | '30d' | 'all';
  compact?: boolean;
}

export function ServerChart({ data, range, compact = false }: ServerChartProps) {
  const isRaw = range === '24h';

  const chartData = data.map((d) => ({
    time: isRaw ? d.checkedAt : d.date,
    players: isRaw ? (d.online ? (d.playersOnline ?? 0) : null) : Number(d.avgPlayers ?? 0),
    max: isRaw ? undefined : (d.maxPlayers ?? 0),
  }));

  const formatTime = (value: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (isRaw) return format(date, 'HH:mm');
    if (range === '7d') return format(date, 'EEE');
    return format(date, 'MMM d');
  };

  if (compact) {
    return (
      <ResponsiveContainer width="100%" height={60}>
        <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="colorPlayersCompact" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="players"
            stroke="#22c55e"
            strokeWidth={1.5}
            fill="url(#colorPlayersCompact)"
            dot={false}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="colorPlayers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorMax" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="time"
          tickFormatter={formatTime}
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(222,47%,14%)',
            border: '1px solid hsl(222,47%,20%)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(value: number) => [value, 'Players']}
          labelFormatter={(label: string) => formatTime(label)}
        />
        <Area
          type="monotone"
          dataKey="players"
          stroke="#22c55e"
          strokeWidth={2}
          fill="url(#colorPlayers)"
          dot={false}
          connectNulls={false}
          name="Players"
        />
        {!isRaw && (
          <Area
            type="monotone"
            dataKey="max"
            stroke="#3b82f6"
            strokeWidth={1}
            fill="url(#colorMax)"
            dot={false}
            strokeDasharray="4 2"
            name="Max"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
