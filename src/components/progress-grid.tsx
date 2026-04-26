'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { GOALS, getDayNumber, getTodayString } from '@/lib/constants';

interface DayStatus {
  dayNum: number;
  date: string;
  isFuture: boolean;
  isToday: boolean;
  goalsComplete: number; // 0–6, or -1 = no data
  manualComplete: boolean;
}

function dateForDay(startDate: string, dayNum: number): string {
  const d = new Date(startDate + 'T00:00:00');
  d.setDate(d.getDate() + dayNum - 1);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

export default function ProgressGrid({ startDate }: { startDate: string }) {
  const [days, setDays] = useState<DayStatus[]>([]);
  const today = getTodayString();

  async function load() {
    const [water, reading, workouts, diet, photos, manualDays] = await Promise.all([
      db.waterEntries.toArray(),
      db.readingLogs.toArray(),
      db.workouts.toArray(),
      db.dietEntries.toArray(),
      db.progressPhotos.toArray(),
      db.completedDays.toArray(),
    ]);

    const waterByDate = new Map<string, number>();
    water.forEach((e) => waterByDate.set(e.date, (waterByDate.get(e.date) ?? 0) + e.amount_ml));

    const pagesByDate = new Map<string, number>();
    reading.forEach((l) => pagesByDate.set(l.date, (pagesByDate.get(l.date) ?? 0) + l.pages_read));

    const outdoorDates = new Set(workouts.filter((w) => w.type === 'outdoor').map((w) => w.date));
    const strengthDates = new Set(workouts.filter((w) => w.type === 'strength').map((w) => w.date));

    const proteinByDate = new Map<string, number>();
    diet.forEach((e) => proteinByDate.set(e.date, (proteinByDate.get(e.date) ?? 0) + Number(e.protein_grams)));

    const photoDates = new Set(photos.map((p) => p.date));
    const manualDates = new Set(manualDays.map((d) => d.date));

    const currentDay = getDayNumber(startDate, today);

    const result: DayStatus[] = Array.from({ length: 75 }, (_, i) => {
      const dayNum = i + 1;
      const date = dateForDay(startDate, dayNum);
      const isFuture = dayNum > currentDay;
      const isToday = date === today;
      const manualComplete = manualDates.has(date);

      let goalsComplete = -1; // -1 = no data tracked
      if (!isFuture) {
        const hasAnyData =
          (waterByDate.get(date) ?? 0) > 0 ||
          (pagesByDate.get(date) ?? 0) > 0 ||
          outdoorDates.has(date) ||
          strengthDates.has(date) ||
          (proteinByDate.get(date) ?? 0) > 0 ||
          photoDates.has(date);

        if (hasAnyData) {
          goalsComplete = 0;
          if ((waterByDate.get(date) ?? 0) >= GOALS.WATER_ML) goalsComplete++;
          if ((pagesByDate.get(date) ?? 0) >= GOALS.READING_PAGES) goalsComplete++;
          if (outdoorDates.has(date)) goalsComplete++;
          if (strengthDates.has(date)) goalsComplete++;
          if ((proteinByDate.get(date) ?? 0) >= GOALS.PROTEIN_GRAMS) goalsComplete++;
          if (photoDates.has(date)) goalsComplete++;
        }
      }

      return { dayNum, date, isFuture, isToday, goalsComplete, manualComplete };
    });

    setDays(result);
  }

  useEffect(() => { load(); }, [startDate, today]);

  async function toggleManual(day: DayStatus) {
    // Only allow toggling past days (not future, not today)
    if (day.isFuture || day.isToday) return;
    if (day.manualComplete) {
      await db.completedDays.where('date').equals(day.date).delete();
    } else {
      await db.completedDays.add({ date: day.date });
    }
    await load();
  }

  if (days.length === 0) return null;

  function cellClass(d: DayStatus) {
    if (d.isFuture) return 'bg-slate-100 text-slate-300';
    if (d.manualComplete || d.goalsComplete === 6) return 'bg-emerald-500 text-white';
    if (d.goalsComplete >= 4) return 'bg-amber-400 text-white';
    if (d.goalsComplete >= 1) return 'bg-orange-300 text-white';
    if (d.goalsComplete === 0) return 'bg-rose-200 text-rose-500'; // has data but nothing complete
    // goalsComplete === -1: past day, no data tracked
    return 'bg-slate-200 text-slate-400';
  }

  const completeDays = days.filter((d) => !d.isFuture && (d.manualComplete || d.goalsComplete === 6)).length;
  const currentDay = days.find((d) => d.isToday)?.dayNum ?? 1;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">75 Day Progress</h2>
        <span className="text-xs text-slate-400">{completeDays} complete</span>
      </div>

      <div className="flex gap-3 text-[10px] text-slate-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" />All done</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" />Partial</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-200 inline-block" />No data</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 inline-block" />Upcoming</span>
      </div>

      <p className="text-[10px] text-slate-400">Tap a past day to mark it complete ✓</p>

      <div className="grid grid-cols-[repeat(7,1fr)] gap-1">
        {days.map((d) => (
          <button
            key={d.dayNum}
            onClick={() => toggleManual(d)}
            disabled={d.isFuture || d.isToday}
            title={`Day ${d.dayNum} — ${d.date}${!d.isFuture ? ` (${d.manualComplete ? 'manually complete' : d.goalsComplete === -1 ? 'no data' : `${d.goalsComplete}/6`})` : ''}`}
            className={`
              aspect-square rounded flex items-center justify-center text-[9px] font-bold relative
              transition-transform active:scale-90
              ${cellClass(d)}
              ${d.isToday ? 'ring-2 ring-slate-800 ring-offset-1' : ''}
              ${!d.isFuture && !d.isToday ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
            `}
          >
            {d.dayNum}
            {d.isToday && d.goalsComplete > 0 && d.goalsComplete < 6 && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-px">
                {Array.from({ length: d.goalsComplete }).map((_, i) => (
                  <span key={i} className="w-0.5 h-0.5 rounded-full bg-current opacity-70" />
                ))}
              </span>
            )}
          </button>
        ))}
      </div>

      <p className="text-xs text-center text-slate-400">Day {currentDay} of 75</p>
    </div>
  );
}
