'use client';

import { useState, useEffect, useRef } from 'react';
import { Utensils, Plus, Camera, X, Loader2, Edit3, MessageSquare } from 'lucide-react';
import ProgressBar from '@/components/progress-bar';
import { GOALS, getTodayString } from '@/lib/constants';
import { db } from '@/lib/db';
import type { DietEntry } from '@/lib/db';

interface AiResult {
  name: string;
  protein_grams: number;
  calories: number;
  items: Array<{ name: string; portion: string; protein_grams: number }>;
}

type Mode = 'none' | 'manual' | 'photo' | 'describe';

export default function DietPage() {
  const [entries, setEntries] = useState<DietEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('none');
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [description, setDescription] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const today = getTodayString();

  const [form, setForm] = useState({ name: '', protein_grams: '', calories: '' });

  async function fetchData() {
    const rows = await db.dietEntries.where('date').equals(today).toArray();
    rows.sort((a, b) => a.logged_at.localeCompare(b.logged_at));
    setEntries(rows);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [today]);

  function openMode(m: Mode) {
    setMode(m);
    setAiResult(null);
    setDescription('');
    setForm({ name: '', protein_grams: '', calories: '' });
  }

  function prefillFromAi(result: AiResult) {
    setAiResult(result);
    setForm({
      name: result.name,
      protein_grams: String(result.protein_grams),
      calories: String(result.calories ?? ''),
    });
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiLoading(true);
    setMode('photo');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/diet/analyze', { method: 'POST', body: formData });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      prefillFromAi(result);
    } catch {
      alert('Failed to analyze photo. Try again or add manually.');
      setMode('none');
    } finally {
      setAiLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDescribe() {
    if (!description.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/diet/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      prefillFromAi(result);
    } catch {
      alert('Failed to estimate protein. Try again or add manually.');
    } finally {
      setAiLoading(false);
    }
  }

  async function submitEntry(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await db.dietEntries.add({
        date: today,
        name: form.name,
        protein_grams: parseFloat(form.protein_grams),
        calories: form.calories ? parseInt(form.calories) : undefined,
        source: mode === 'photo' ? 'photo' : 'manual',
        logged_at: new Date().toISOString(),
      });
      openMode('none');
      await fetchData();
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteEntry(id: number) {
    await db.dietEntries.delete(id);
    await fetchData();
  }

  const totalProtein = entries.reduce((sum, e) => sum + Number(e.protein_grams), 0);
  const protein = Math.round(totalProtein);
  const remaining = Math.max(0, GOALS.PROTEIN_GRAMS - protein);

  // Show the confirm form when AI is done or manual mode is open
  const showForm = (mode === 'manual') ||
    (mode === 'photo' && !aiLoading && aiResult) ||
    (mode === 'describe' && !aiLoading && aiResult);

  return (
    <div className="p-4 pt-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Utensils size={18} className="text-purple-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Diet & Protein</h1>
        </div>
        <p className="text-sm text-slate-500">Goal: {GOALS.PROTEIN_GRAMS}g protein daily</p>
      </div>

      {/* Protein Progress */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="text-4xl font-bold text-slate-800">{protein}</span>
            <span className="text-lg text-slate-400">g / {GOALS.PROTEIN_GRAMS}g</span>
          </div>
          {protein >= GOALS.PROTEIN_GRAMS
            ? <span className="text-emerald-600 font-semibold text-sm">Goal met! 🎉</span>
            : <span className="text-purple-600 text-sm font-medium">{remaining}g to go</span>
          }
        </div>
        <ProgressBar value={protein} max={GOALS.PROTEIN_GRAMS} color="purple" height="lg" />
      </div>

      {/* Three add buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => openMode('manual')}
          className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl border border-slate-200 transition-colors flex flex-col items-center justify-center gap-1.5 min-h-[64px]"
        >
          <Edit3 size={18} className="text-purple-500" />
          <span className="text-xs">Manual</span>
        </button>
        <button
          onClick={() => openMode('describe')}
          className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl border border-slate-200 transition-colors flex flex-col items-center justify-center gap-1.5 min-h-[64px]"
        >
          <MessageSquare size={18} className="text-purple-500" />
          <span className="text-xs">Describe</span>
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={aiLoading && mode === 'photo'}
          className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white font-semibold py-3 rounded-xl transition-colors flex flex-col items-center justify-center gap-1.5 min-h-[64px]"
        >
          {aiLoading && mode === 'photo'
            ? <Loader2 size={18} className="animate-spin" />
            : <Camera size={18} />}
          <span className="text-xs">{aiLoading && mode === 'photo' ? 'Reading...' : 'Photo'}</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
      </div>

      {/* Describe input */}
      {mode === 'describe' && !aiResult && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Describe Your Meal</h3>
            <button onClick={() => openMode('none')} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 2 scrambled eggs, a cup of greek yogurt, and a protein shake with 25g protein"
            rows={3}
            className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 text-sm resize-none"
          />
          <button
            onClick={handleDescribe}
            disabled={aiLoading || !description.trim()}
            className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {aiLoading ? <><Loader2 size={18} className="animate-spin" />Estimating...</> : <><MessageSquare size={18} />Estimate Protein</>}
          </button>
        </div>
      )}

      {/* Confirm form — manual / after photo / after describe */}
      {showForm && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">
              {mode === 'manual' ? 'Add Entry' : 'Confirm — edit if needed'}
            </h3>
            <button onClick={() => openMode('none')} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>

          {aiResult && (
            <div className="mb-4 bg-purple-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-purple-600 mb-1.5">
                {mode === 'photo' ? '📷 Photo analysis' : '💬 From description'}
              </p>
              <div className="space-y-0.5">
                {aiResult.items.map((item, i) => (
                  <p key={i} className="text-xs text-slate-600">
                    {item.name} ({item.portion}) — {item.protein_grams}g protein
                  </p>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={submitEntry} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Food Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Grilled Chicken Breast"
                className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Protein (g) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.protein_grams}
                  onChange={(e) => setForm({ ...form, protein_grams: e.target.value })}
                  placeholder="30"
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Calories</label>
                <input
                  type="number"
                  min="0"
                  value={form.calories}
                  onChange={(e) => setForm({ ...form, calories: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white font-semibold py-3.5 rounded-xl transition-colors min-h-[48px] flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 size={18} className="animate-spin" />Saving...</> : <><Plus size={18} />Save Entry</>}
            </button>
          </form>
        </div>
      )}

      {/* Today's Entries */}
      {entries.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Today&apos;s Entries</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50">
            {entries.map((entry) => {
              const time = new Date(entry.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
              return (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-slate-700 truncate">{entry.name}</p>
                      {entry.source === 'photo' && <Camera size={12} className="text-purple-400 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold text-purple-600">{Number(entry.protein_grams).toFixed(1)}g protein</span>
                      {entry.calories && <span className="text-xs text-slate-400">{entry.calories} kcal</span>}
                      <span className="text-xs text-slate-400">{time}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => entry.id !== undefined && deleteEntry(entry.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
