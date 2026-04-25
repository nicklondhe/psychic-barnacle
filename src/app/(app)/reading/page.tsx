'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Plus, X, ChevronDown, Zap } from 'lucide-react';
import ProgressBar from '@/components/progress-bar';
import { GOALS, getTodayString } from '@/lib/constants';
import { db } from '@/lib/db';
import type { Book, ReadingLog } from '@/lib/db';

interface ReadingLogWithTitle extends ReadingLog {
  book_title: string;
}

interface Stats {
  avg_wpm: number | null;
  total_pages_all_time: number;
}

export default function ReadingPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [todayLogs, setTodayLogs] = useState<ReadingLogWithTitle[]>([]);
  const [stats, setStats] = useState<Stats>({ avg_wpm: null, total_pages_all_time: 0 });
  const [showLogModal, setShowLogModal] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);
  const [loading, setLoading] = useState(true);
  const today = getTodayString();

  const [logForm, setLogForm] = useState({
    book_id: '',
    pages_read: '',
    start_page: '',
    end_page: '',
    duration_minutes: '',
  });

  const [bookForm, setBookForm] = useState({ title: '', author: '', total_pages: '' });
  const [submitting, setSubmitting] = useState(false);

  async function fetchAll() {
    const [allBooks, allLogs, allLogsForStats] = await Promise.all([
      db.books.filter((b) => b.is_active).toArray(),
      db.readingLogs.where('date').equals(today).toArray(),
      db.readingLogs.toArray(),
    ]);

    // Attach book titles to today's logs
    const booksById = new Map(allBooks.map((b) => [b.id!, b]));
    const logsWithTitle: ReadingLogWithTitle[] = allLogs.map((log) => ({
      ...log,
      book_title: booksById.get(log.book_id)?.title ?? 'Unknown Book',
    }));
    logsWithTitle.sort((a, b) => a.logged_at.localeCompare(b.logged_at));

    // Calculate stats
    const totalPages = allLogsForStats.reduce((sum, l) => sum + l.pages_read, 0);
    const logsWithDuration = allLogsForStats.filter(
      (l) => l.duration_minutes && l.duration_minutes > 0 && l.pages_read > 0
    );
    let avgWpm: number | null = null;
    if (logsWithDuration.length > 0) {
      // Estimate words from pages (avg 250 words/page)
      const totalWords = logsWithDuration.reduce((sum, l) => sum + l.pages_read * 250, 0);
      const totalMinutes = logsWithDuration.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0);
      avgWpm = totalMinutes > 0 ? Math.round(totalWords / totalMinutes) : null;
    }

    setBooks(allBooks);
    setTodayLogs(logsWithTitle);
    setStats({ avg_wpm: avgWpm, total_pages_all_time: totalPages });
    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
  }, [today]);

  async function submitLog(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const bookId = parseInt(logForm.book_id);
      const pagesRead = parseInt(logForm.pages_read);
      const endPage = logForm.end_page ? parseInt(logForm.end_page) : undefined;
      const startPage = logForm.start_page ? parseInt(logForm.start_page) : undefined;
      const durationMinutes = logForm.duration_minutes ? parseInt(logForm.duration_minutes) : undefined;

      await db.readingLogs.add({
        book_id: bookId,
        date: today,
        pages_read: pagesRead,
        start_page: startPage,
        end_page: endPage,
        duration_minutes: durationMinutes,
        logged_at: new Date().toISOString(),
      });

      // Update book's current_page
      const book = books.find((b) => b.id === bookId);
      if (book) {
        const newPage = endPage ?? (book.current_page + pagesRead);
        await db.books.update(bookId, { current_page: newPage });
      }

      setShowLogModal(false);
      setLogForm({ book_id: '', pages_read: '', start_page: '', end_page: '', duration_minutes: '' });
      await fetchAll();
    } finally {
      setSubmitting(false);
    }
  }

  async function submitBook(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      await db.books.add({
        title: bookForm.title,
        author: bookForm.author || undefined,
        total_pages: bookForm.total_pages ? parseInt(bookForm.total_pages) : undefined,
        current_page: 0,
        is_active: true,
        started_at: today,
        created_at: now,
      });
      setShowAddBook(false);
      setBookForm({ title: '', author: '', total_pages: '' });
      await fetchAll();
    } finally {
      setSubmitting(false);
    }
  }

  const activeBooks = books.filter((b) => b.is_active);
  const pagesRead = todayLogs.reduce((sum, l) => sum + l.pages_read, 0);

  if (loading) {
    return (
      <div className="p-4 pt-8 space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-xl w-1/2" />
        <div className="h-2 bg-slate-200 rounded-full" />
        <div className="h-32 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 pt-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <BookOpen size={18} className="text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Reading</h1>
        </div>
        <p className="text-sm text-slate-500">Goal: {GOALS.READING_PAGES} pages daily</p>
      </div>

      {/* Today's progress */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="text-4xl font-bold text-slate-800">{pagesRead}</span>
            <span className="text-lg text-slate-400"> / {GOALS.READING_PAGES} pages</span>
          </div>
          {pagesRead >= GOALS.READING_PAGES && (
            <span className="text-emerald-600 font-semibold text-sm">Complete! 🎉</span>
          )}
        </div>
        <ProgressBar value={pagesRead} max={GOALS.READING_PAGES} color="green" height="lg" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
          <p className="text-xl font-bold text-slate-800">{stats.total_pages_all_time}</p>
          <p className="text-xs text-slate-500">total pages</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
          <div className="flex items-center justify-center gap-1">
            <Zap size={14} className="text-amber-500" />
            <p className="text-xl font-bold text-slate-800">{stats.avg_wpm ?? '—'}</p>
          </div>
          <p className="text-xs text-slate-500">wpm</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowLogModal(true)}
          disabled={activeBooks.length === 0}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 min-h-[48px]"
        >
          <BookOpen size={18} />
          Log Reading
        </button>
        <button
          onClick={() => setShowAddBook(true)}
          className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3.5 rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2 min-h-[48px]"
        >
          <Plus size={18} />
          Add Book
        </button>
      </div>

      {/* Active Books */}
      {activeBooks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Active Books</h2>
          <div className="space-y-2">
            {activeBooks.map((book) => {
              const progress =
                book.total_pages && book.current_page
                  ? Math.round((book.current_page / book.total_pages) * 100)
                  : null;
              return (
                <div key={book.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{book.title}</p>
                      {book.author && <p className="text-xs text-slate-400">{book.author}</p>}
                    </div>
                    {progress !== null && (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {progress}%
                      </span>
                    )}
                  </div>
                  {book.total_pages && (
                    <>
                      <ProgressBar
                        value={book.current_page ?? 0}
                        max={book.total_pages}
                        color="green"
                        height="sm"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Page {book.current_page ?? 0} of {book.total_pages}
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Today's Sessions */}
      {todayLogs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Today&apos;s Sessions</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50">
            {todayLogs.map((log) => {
              const time = new Date(log.logged_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });
              return (
                <div key={log.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">{log.book_title}</p>
                    <span className="text-xs text-slate-400">{time}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-emerald-600 font-medium">+{log.pages_read} pages</span>
                    {log.duration_minutes && (
                      <span className="text-xs text-slate-400">{log.duration_minutes} min</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Log Reading Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-0">
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">Log Reading</h3>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={22} />
              </button>
            </div>
            <form onSubmit={submitLog} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Book</label>
                <div className="relative">
                  <select
                    value={logForm.book_id}
                    onChange={(e) => setLogForm({ ...logForm, book_id: e.target.value })}
                    className="w-full px-3 py-3 border border-slate-200 rounded-xl appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                    required
                  >
                    <option value="">Select a book...</option>
                    {activeBooks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pages Read *</label>
                <input
                  type="number"
                  min="1"
                  value={logForm.pages_read}
                  onChange={(e) => setLogForm({ ...logForm, pages_read: e.target.value })}
                  placeholder="10"
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Page</label>
                  <input
                    type="number"
                    min="1"
                    value={logForm.start_page}
                    onChange={(e) => setLogForm({ ...logForm, start_page: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Page</label>
                  <input
                    type="number"
                    min="1"
                    value={logForm.end_page}
                    onChange={(e) => setLogForm({ ...logForm, end_page: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  min="1"
                  value={logForm.duration_minutes}
                  onChange={(e) => setLogForm({ ...logForm, duration_minutes: e.target.value })}
                  placeholder="Optional — used for speed tracking"
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold py-3.5 rounded-xl transition-colors min-h-[48px]"
              >
                {submitting ? 'Saving...' : 'Log Reading'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Book Modal */}
      {showAddBook && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-0">
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">Add Book</h3>
              <button onClick={() => setShowAddBook(false)} className="text-slate-400 hover:text-slate-600">
                <X size={22} />
              </button>
            </div>
            <form onSubmit={submitBook} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  placeholder="Book title"
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Author</label>
                <input
                  type="text"
                  value={bookForm.author}
                  onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Total Pages</label>
                <input
                  type="number"
                  min="1"
                  value={bookForm.total_pages}
                  onChange={(e) => setBookForm({ ...bookForm, total_pages: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold py-3.5 rounded-xl transition-colors min-h-[48px]"
              >
                {submitting ? 'Adding...' : 'Add Book'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
