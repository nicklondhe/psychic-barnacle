'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Droplets, BookOpen, Dumbbell, Utensils, Camera } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard, activeColor: 'text-slate-700' },
  { href: '/water', label: 'Water', icon: Droplets, activeColor: 'text-sky-500' },
  { href: '/reading', label: 'Reading', icon: BookOpen, activeColor: 'text-emerald-500' },
  { href: '/workouts', label: 'Workouts', icon: Dumbbell, activeColor: 'text-amber-500' },
  { href: '/diet', label: 'Diet', icon: Utensils, activeColor: 'text-purple-500' },
  { href: '/photos', label: 'Photos', icon: Camera, activeColor: 'text-rose-500' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
      <div className="max-w-md mx-auto flex items-center justify-around px-1">
        {navItems.map(({ href, label, icon: Icon, activeColor }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center py-2.5 px-1 min-w-0 flex-1 min-h-[52px] transition-colors ${
                isActive ? activeColor : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[9px] mt-0.5 font-medium leading-tight text-center">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
