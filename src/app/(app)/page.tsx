'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Droplets,
  BookOpen,
  Dumbbell,
  Utensils,
  CheckCircle2,
  ChevronRight,
  Camera,
  Wine,
  UtensilsCrossed,
  LayoutGrid,
  Target,
} from 'lucide-react';
import ProgressBar from '@/components/progress-bar';
import ProgressGrid from '@/components/progress-grid';
import { GOALS, getTodayString, getGreeting, getDayNumber } from '@/lib/constants';
import { db, ensureChallengeConfig } from '@/lib/db';
import type { DailyCheckin } from '@/lib/db';

interface DashboardState {
  dayNumber: number;
  startDate: string;
  waterMl: number;
  pagesRead: number;
  outdoorDone: boolean;
  strengthDone: boolean;
  proteinGrams: number;
  hasProgressPhoto: boolean;
  checkin: DailyCheckin | null;
}

function useFlip() {
  const [showGrid, setShowGrid] = useState(false);
  const [midFlip, setMidFlip] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  function flip() {
    clearTimeout(timer.current);
    setMidFlip(true);
    timer.current = setTimeout(() => {
      setShowGrid((v) => !v);
      setMidFlip(false);
    }, 180);
  }

  return { showGrid, midFlip, flip };
}

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const { showGrid, midFlip, flip } = useFlip();
  const today = getTodayString();

  async function loadData() {
    await ensureChallengeConfig();

    const [waterEntries, readingLogs, workouts, dietEntries, photo, checkin, config] =
      await Promise.all([
        db.waterEntries.where('date').equals(today).toArray(),
        db.readingLogs.where('date').equals(today).toArray(),
        db.workouts.where('date').equals(today).toArray(),
        db.dietEntries.where('date').equals(today).toArray(),
        db.progressPhotos.where('date').equals(today).first(),
        db.dailyCheckins.where('date').equals(today).first(),
        db.challengeConfig.toCollection().first(),
      ]);

    const waterMl = waterEntries.reduce((s, e) => s + e.amount_ml, 0);
    const pagesRead = readingLogs.reduce((s, l) => s + l.pages_read, 0);
    const outdoorDone = workouts.some((w) => w.type === 'outdoor');
    const strengthDone = workouts.some((w) => w.type === 'strength');
    const proteinGrams = dietEntries.reduce((s, e) => s + Number(e.protein_grams), 0);
    const startDate = config?.start_date ?? '2026-04-20';

    setState({
      dayNumber: getDayNumber(startDate, today),
      startDate,
      waterMl,
      pagesRead,
      outdoorDone,
      strengthDone,
      proteinGrams,
      hasProgressPhoto: !!photo,
      checkin: checkin ?? null,
    });
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [today]);

  async function toggleCheckin(field: 'no_alcohol' | 'no_cheat_meal') {
    if (!state) return;
    const now = new Date().toISOString();
    // re-fetch to get the id so put() updates the existing row instead of inserting
    const existing = await db.dailyCheckins.where('date').equals(today).first();
    const base = existing ?? { date: today, no_alcohol: false, no_cheat_meal: false, updated_at: now };
    const updated: DailyCheckin = { ...base, [field]: !base[field], updated_at: now };
    await db.dailyCheckins.put(updated);
    setState({ ...state, checkin: updated });
  }

  const waterGlasses = state ? Math.floor(state.waterMl / GOALS.GLASS_ML) : 0;
  const allGoalsMet =
    state &&
    state.waterMl >= GOALS.WATER_ML &&
    state.pagesRead >= GOALS.READING_PAGES &&
    state.outdoorDone &&
    state.strengthDone &&
    state.proteinGrams >= GOALS.PROTEIN_GRAMS &&
    state.hasProgressPhoto;

  const formattedDate = new Date(today + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const noAlcohol = state?.checkin?.no_alcohol ?? false;
  const noCheatMeal = state?.checkin?.no_cheat_meal ?? false;

  if (loading) {
    return (
      <div className="p-4 pt-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-xl w-2/3" />
          <div className="h-5 bg-slate-200 rounded-xl w-1/2" />
          <div className="grid grid-cols-2 gap-3 mt-6">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-32 bg-slate-200 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-8 space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">75</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">75 Hard</h1>
        </div>
        <p className="text-sm text-slate-500">{formattedDate}</p>
        <p className="text-lg font-semibold text-slate-700 mt-1">
          {getGreeting()}! Day {state?.dayNumber ?? 1} of 75
        </p>
      </div>

      {/* All done banner */}
      {allGoalsMet && (
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-4 flex items-center gap-3 text-white shadow-lg shadow-emerald-200">
          <CheckCircle2 size={28} />
          <div>
            <p className="font-bold text-lg">Today is complete! 🎯</p>
            <p className="text-emerald-100 text-sm">All goals crushed. Amazing work!</p>
          </div>
        </div>
      )}

      {/* Daily Check-in */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Daily Check-in</h2>
        <div className="flex gap-3">
          <button
            onClick={() => toggleCheckin('no_alcohol')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all active:scale-95 ${
              noAlcohol ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'
            }`}
          >
            <Wine size={16} />No Alcohol
            {noAlcohol && <CheckCircle2 size={14} className="text-emerald-500" />}
          </button>
          <button
            onClick={() => toggleCheckin('no_cheat_meal')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all active:scale-95 ${
              noCheatMeal ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'
            }`}
          >
            <UtensilsCrossed size={16} />No Cheat
            {noCheatMeal && <CheckCircle2 size={14} className="text-emerald-500" />}
          </button>
        </div>
      </div>

      {/* Flip card section */}
      <div>
        {/* Toggle pill */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-600">
            {showGrid ? '75 Day History' : "Today's Goals"}
          </span>
          <button
            onClick={flip}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600"
          >
            {showGrid ? <><Target size={13} />Today</> : <><LayoutGrid size={13} />75 Days</>}
          </button>
        </div>

        {/* Flip animation wrapper */}
        <div
          style={{
            transition: 'transform 0.18s ease-in-out',
            transform: midFlip ? 'rotateY(90deg)' : 'rotateY(0deg)',
            transformOrigin: 'center center',
          }}
        >
          {showGrid ? (
            /* Back: 75-day grid */
            <ProgressGrid startDate={state?.startDate ?? '2026-04-20'} />
          ) : (
            /* Front: 6 goal cards */
            <div className="grid grid-cols-2 gap-3">
              <Link href="/water" className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-95 transition-transform">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 bg-sky-100 rounded-xl flex items-center justify-center">
                    <Droplets size={18} className="text-sky-500" />
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {waterGlasses}<span className="text-base font-normal text-slate-400">/10</span>
                </p>
                <p className="text-xs text-slate-500 mb-2">glasses</p>
                <ProgressBar value={state?.waterMl ?? 0} max={GOALS.WATER_ML} color="blue" height="sm" />
              </Link>

              <Link href="/reading" className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-95 transition-transform">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <BookOpen size={18} className="text-emerald-500" />
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {state?.pagesRead ?? 0}<span className="text-base font-normal text-slate-400">/10</span>
                </p>
                <p className="text-xs text-slate-500 mb-2">pages</p>
                <ProgressBar value={state?.pagesRead ?? 0} max={GOALS.READING_PAGES} color="green" height="sm" />
              </Link>

              <Link href="/workouts" className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-95 transition-transform">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${state?.outdoorDone ? 'bg-amber-500' : 'bg-amber-100'}`}>
                    <Dumbbell size={18} className={state?.outdoorDone ? 'text-white' : 'text-amber-500'} />
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
                <p className={`text-sm font-bold mb-0.5 ${state?.outdoorDone ? 'text-amber-600' : 'text-slate-400'}`}>
                  {state?.outdoorDone ? 'Done ✓' : 'Not done'}
                </p>
                <p className="text-xs text-slate-500">Outdoor workout</p>
              </Link>

              <Link href="/workouts" className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-95 transition-transform">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${state?.strengthDone ? 'bg-amber-500' : 'bg-amber-100'}`}>
                    <Dumbbell size={18} className={state?.strengthDone ? 'text-white' : 'text-amber-500'} />
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
                <p className={`text-sm font-bold mb-0.5 ${state?.strengthDone ? 'text-amber-600' : 'text-slate-400'}`}>
                  {state?.strengthDone ? 'Done ✓' : 'Not done'}
                </p>
                <p className="text-xs text-slate-500">Strength workout</p>
              </Link>

              <Link href="/diet" className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-95 transition-transform">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Utensils size={18} className="text-purple-500" />
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {Math.round(state?.proteinGrams ?? 0)}<span className="text-base font-normal text-slate-400">g</span>
                </p>
                <p className="text-xs text-slate-500 mb-2">protein / 175g</p>
                <ProgressBar value={state?.proteinGrams ?? 0} max={GOALS.PROTEIN_GRAMS} color="purple" height="sm" />
              </Link>

              <Link href="/photos" className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-95 transition-transform">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${state?.hasProgressPhoto ? 'bg-rose-500' : 'bg-rose-100'}`}>
                    <Camera size={18} className={state?.hasProgressPhoto ? 'text-white' : 'text-rose-400'} />
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
                <p className={`text-sm font-bold mb-0.5 ${state?.hasProgressPhoto ? 'text-rose-500' : 'text-slate-400'}`}>
                  {state?.hasProgressPhoto ? 'Taken ✓' : 'Not taken'}
                </p>
                <p className="text-xs text-slate-500">Progress photo</p>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
