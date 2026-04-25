import Nav from '@/components/nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50">
      <main className="max-w-md mx-auto pb-20">{children}</main>
      <Nav />
    </div>
  );
}
