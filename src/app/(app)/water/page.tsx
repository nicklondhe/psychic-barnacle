'use client';

import { useState, useEffect } from 'react';
import { Droplets, Undo2 } from 'lucide-react';
import ProgressRing from '@/components/progress-ring';
import { GOALS, getTodayString } from '@/lib/constants';
import { db } from '@/lib/db';
import type { WaterEntry } from '@/lib/db';

export default function WaterPage() {
  const [entries, setEntries] = useState<WaterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const today = getTodayString();

  async function fetchData() {
    const rows = await db.waterEntries.where('date').equals(today).toArray();
    // Sort by logged_at ascending
    rows.sort((a, b) => a.logged_at.localeCompare(b.logged_at));
    setEntries(rows);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [today]);

  async function addGlass() {
    setAdding(true);
    try {
      await db.waterEntries.add({
        date: today,
        amount_ml: GOALS.GLASS_ML,
        logged_at: new Date().toISOString(),
      });
      await fetchData();
    } finally {
      setAdding(false);
    }
  }

  async function undoLast() {
    if (entries.length === 0) return;
    const last = entries[entries.length - 1];
    if (last.id !== undefined) {
      await db.waterEntries.delete(last.id);
      await fetchData();
    }
  }

  const totalMl = entries.reduce((sum, e) => sum + e.amount_ml, 0);
  const glasses = Math.floor(totalMl / GOALS.GLASS_ML);
  const remaining = Math.max(0, GOALS.WATER_GLASSES - glasses);

  return (
    <div className="p-4 pt-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
            <Droplets size={18} className="text-sky-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Water Intake</h1>
        </div>
        <p className="text-sm text-slate-500">Goal: {GOALS.WATER_GLASSES} glasses (4,000ml) daily</p>
      </div>

      {/* Progress Ring */}
      <div className="flex flex-col items-center py-4">
        <ProgressRing
          value={totalMl}
          max={GOALS.WATER_ML}
          size={180}
          strokeWidth={16}
          color="#0ea5e9"
          label={String(glasses)}
          sublabel={`/ ${GOALS.WATER_GLASSES} glasses`}
        />
        <p className="mt-3 text-slate-500 text-sm">
          {totalMl}ml / {GOALS.WATER_ML}ml
        </p>
        {remaining > 0 ? (
          <p className="text-sky-600 font-medium text-sm mt-1">
            {remaining} glass{remaining !== 1 ? 'es' : ''} to go!
          </p>
        ) : (
          <p className="text-emerald-600 font-semibold text-sm mt-1">
            Daily goal complete! 🎉
          </p>
        )}
      </div>

      {/* Add Glass Button */}
      <button
        onClick={addGlass}
        disabled={adding}
        className="w-full bg-sky-500 hover:bg-sky-600 active:bg-sky-700 disabled:bg-sky-300 text-white font-bold py-5 rounded-2xl text-lg shadow-lg shadow-sky-200 transition-all active:scale-95 flex items-center justify-center gap-3 min-h-[72px]"
      >
        {adding ? (
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <Droplets size={24} />
            Add Glass (400ml)
          </>
        )}
      </button>

      {/* Undo + Today's log */}
      {entries.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-600">Today&apos;s Log</h2>
            <button
              onClick={undoLast}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Undo2 size={14} />
              Undo last
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50">
            {[...entries].reverse().map((entry) => {
              const time = new Date(entry.logged_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });
              return (
                <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Droplets size={16} className="text-sky-400" />
                    <span className="text-slate-700 text-sm font-medium">{entry.amount_ml}ml</span>
                  </div>
                  <span className="text-xs text-slate-400">{time}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
