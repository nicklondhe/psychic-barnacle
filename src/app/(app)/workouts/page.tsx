'use client';

import { useState, useEffect } from 'react';
import { Dumbbell, CheckCircle2, X, Footprints, Activity, Bike } from 'lucide-react';
import { GOALS, getTodayString } from '@/lib/constants';
import { db } from '@/lib/db';
import type { Workout } from '@/lib/db';

const OUTDOOR_SUBTYPES = ['Walk', 'Run+Walk', 'Bike'];

const subtypeIcons: Record<string, React.ReactNode> = {
  Walk: <Footprints size={18} />,
  'Run+Walk': <Activity size={18} />,
  Bike: <Bike size={18} />,
};

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<'outdoor' | 'strength' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const today = getTodayString();

  const [form, setForm] = useState({
    subtype: 'Walk',
    duration_minutes: '',
    notes: '',
  });

  async function fetchWorkouts() {
    const rows = await db.workouts.where('date').equals(today).toArray();
    rows.sort((a, b) => a.logged_at.localeCompare(b.logged_at));
    setWorkouts(rows);
    setLoading(false);
  }

  useEffect(() => {
    fetchWorkouts();
  }, [today]);

  async function submitWorkout(e: React.FormEvent) {
    e.preventDefault();
    if (!showForm) return;
    setSubmitting(true);
    try {
      await db.workouts.add({
        date: today,
        type: showForm,
        subtype: showForm === 'outdoor' ? form.subtype : undefined,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : undefined,
        notes: form.notes || undefined,
        logged_at: new Date().toISOString(),
      });
      setShowForm(null);
      setForm({ subtype: 'Walk', duration_minutes: '', notes: '' });
      await fetchWorkouts();
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteWorkout(id: number) {
    await db.workouts.delete(id);
    await fetchWorkouts();
  }

  const outdoorWorkouts = workouts.filter((w) => w.type === 'outdoor');
  const strengthWorkouts = workouts.filter((w) => w.type === 'strength');
  const outdoorDone = outdoorWorkouts.length > 0;
  const strengthDone = strengthWorkouts.length > 0;

  return (
    <div className="p-4 pt-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <Dumbbell size={18} className="text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Workouts</h1>
        </div>
        <p className="text-sm text-slate-500">Goal: 2 workouts daily (1 outdoor + 1 strength)</p>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="flex-1 text-center">
            <p className="text-3xl font-bold text-slate-800">
              {(outdoorDone ? 1 : 0) + (strengthDone ? 1 : 0)}
              <span className="text-lg font-normal text-slate-400"> / {GOALS.WORKOUTS_COUNT}</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">workouts today</p>
          </div>
          <div className="h-12 w-px bg-slate-100" />
          <div className="flex-1 flex items-center justify-center gap-2">
            <div className={`w-3 h-3 rounded-full ${outdoorDone ? 'bg-amber-500' : 'bg-slate-200'}`} />
            <span className="text-sm text-slate-600">Outdoor</span>
          </div>
          <div className="flex-1 flex items-center justify-center gap-2">
            <div className={`w-3 h-3 rounded-full ${strengthDone ? 'bg-amber-500' : 'bg-slate-200'}`} />
            <span className="text-sm text-slate-600">Strength</span>
          </div>
        </div>
      </div>

      {/* Workout Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Outdoor Card */}
        <button
          onClick={() => { setShowForm('outdoor'); setForm({ subtype: 'Walk', duration_minutes: '', notes: '' }); }}
          className={`relative bg-white rounded-2xl p-5 shadow-sm border-2 transition-all active:scale-95 text-left ${
            outdoorDone ? 'border-amber-400 bg-amber-50' : 'border-slate-100 hover:border-amber-200'
          }`}
        >
          {outdoorDone && (
            <CheckCircle2 size={20} className="absolute top-3 right-3 text-amber-500" />
          )}
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
            <Activity size={20} className="text-amber-600" />
          </div>
          <p className="font-semibold text-slate-800">Outdoor</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {outdoorDone ? `${outdoorWorkouts[0].subtype ?? 'Done'} ✓` : 'Tap to log'}
          </p>
          {outdoorWorkouts[0]?.duration_minutes && (
            <p className="text-xs text-amber-600 font-medium mt-1">{outdoorWorkouts[0].duration_minutes} min</p>
          )}
        </button>

        {/* Strength Card */}
        <button
          onClick={() => { setShowForm('strength'); setForm({ subtype: '', duration_minutes: '', notes: '' }); }}
          className={`relative bg-white rounded-2xl p-5 shadow-sm border-2 transition-all active:scale-95 text-left ${
            strengthDone ? 'border-amber-400 bg-amber-50' : 'border-slate-100 hover:border-amber-200'
          }`}
        >
          {strengthDone && (
            <CheckCircle2 size={20} className="absolute top-3 right-3 text-amber-500" />
          )}
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
            <Dumbbell size={20} className="text-amber-600" />
          </div>
          <p className="font-semibold text-slate-800">Strength</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {strengthDone ? 'Done ✓' : 'Tap to log'}
          </p>
          {strengthWorkouts[0]?.duration_minutes && (
            <p className="text-xs text-amber-600 font-medium mt-1">{strengthWorkouts[0].duration_minutes} min</p>
          )}
        </button>
      </div>

      {/* Today's workout list */}
      {workouts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Today&apos;s Workouts</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50">
            {workouts.map((workout) => {
              const time = new Date(workout.logged_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });
              return (
                <div key={workout.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {workout.type === 'outdoor'
                      ? (subtypeIcons[workout.subtype ?? ''] ?? <Activity size={16} className="text-amber-600" />)
                      : <Dumbbell size={16} className="text-amber-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 capitalize">
                      {workout.subtype ?? workout.type}
                    </p>
                    <div className="flex items-center gap-2">
                      {workout.duration_minutes && (
                        <span className="text-xs text-slate-400">{workout.duration_minutes} min</span>
                      )}
                      <span className="text-xs text-slate-400">{time}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => workout.id !== undefined && deleteWorkout(workout.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors p-1"
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
          <div className="w-6 h-6 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Log Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-0">
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900 capitalize">
                Log {showForm} Workout
              </h3>
              <button onClick={() => setShowForm(null)} className="text-slate-400 hover:text-slate-600">
                <X size={22} />
              </button>
            </div>
            <form onSubmit={submitWorkout} className="space-y-4">
              {showForm === 'outdoor' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Activity Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {OUTDOOR_SUBTYPES.map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setForm({ ...form, subtype: sub })}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-colors border-2 ${
                          form.subtype === sub
                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : 'border-slate-100 text-slate-600 hover:border-amber-200'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  min="1"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                  placeholder="e.g. 45"
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes..."
                  rows={3}
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold py-3.5 rounded-xl transition-colors min-h-[48px]"
              >
                {submitting ? 'Logging...' : 'Log Workout'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
