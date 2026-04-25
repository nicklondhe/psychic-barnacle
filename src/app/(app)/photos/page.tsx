'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { getTodayString } from '@/lib/constants';
import { db } from '@/lib/db';
import type { ProgressPhoto } from '@/lib/db';

const MAX_PX = 800;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const today = getTodayString();

  async function fetchPhotos() {
    const rows = await db.progressPhotos.toArray();
    rows.sort((a, b) => b.date.localeCompare(a.date));
    setPhotos(rows);
    setLoading(false);
  }

  useEffect(() => { fetchPhotos(); }, []);

  const hasTodayPhoto = photos.some((p) => p.date === today);

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const dataUrl = await compressImage(file);
      const existing = await db.progressPhotos.where('date').equals(today).first();
      await db.progressPhotos.put({
        ...(existing ? { id: existing.id } : {}),
        date: today,
        photo_url: dataUrl,
        logged_at: new Date().toISOString(),
      });
      await fetchPhotos();
    } catch {
      alert('Failed to save photo. Please try again.');
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="p-4 pt-8 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
            <Camera size={18} className="text-rose-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Progress Photos</h1>
        </div>
        <p className="text-sm text-slate-500">Stored privately on this device</p>
      </div>

      {!hasTodayPhoto ? (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={saving}
          className="w-full bg-rose-500 hover:bg-rose-600 active:bg-rose-700 disabled:bg-rose-300 text-white font-bold py-5 rounded-2xl text-lg shadow-lg shadow-rose-200 transition-all active:scale-95 flex items-center justify-center gap-3 min-h-[72px]"
        >
          {saving ? <><Loader2 size={24} className="animate-spin" />Saving...</> : <><Camera size={24} />Take Today&apos;s Photo</>}
        </button>
      ) : (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Camera size={18} className="text-rose-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-rose-700">Today&apos;s photo saved!</p>
            <p className="text-xs text-rose-400">Stored locally on your device.</p>
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={saving} className="text-xs text-rose-500 font-medium hover:text-rose-700">
            Retake
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
        </div>
      ) : photos.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">All Photos ({photos.length})</h2>
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                <div className="aspect-square bg-slate-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.photo_url} alt={`Progress ${photo.date}`} className="w-full h-full object-cover" />
                </div>
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-slate-700">{formatDate(photo.date)}</p>
                  {photo.date === today && <p className="text-xs text-rose-500 font-medium">Today</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Camera size={28} className="text-rose-300" />
          </div>
          <p className="text-slate-500 font-medium">No photos yet</p>
          <p className="text-slate-400 text-sm mt-1">Take your first progress photo above!</p>
        </div>
      )}
    </div>
  );
}
