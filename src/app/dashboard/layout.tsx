import { LucideLayoutDashboard, LucideGlobe, LucideSearch, LucideFileText, LucideSettings, LucideUpload } from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md">
        <div className="h-16 flex items-center px-6 border-b">
          <span className="text-xl font-bold text-gray-800">MapSweep</span>
        </div>
        <nav className="p-4 space-y-2">
          <Link href="/dashboard" className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg">
            <LucideLayoutDashboard size={20} />
            <span>Overview</span>
          </Link>
          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 uppercase">Analysis</div>
          <Link href="/dashboard/keywords" className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg">
            <LucideSearch size={20} />
            <span>Keyword Coverage</span>
          </Link>
          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 uppercase">Management</div>
          <Link href="/dashboard/domains" className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg">
            <LucideGlobe size={20} />
            <span>Competitors</span>
          </Link>
          <Link href="/dashboard/import" className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg">
             <LucideUpload size={20} />
             <span>Bulk Import</span>
          </Link>
          <Link href="/dashboard/logs" className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg">
             <LucideFileText size={20} />
             <span>Import Logs</span>
          </Link>
          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 uppercase">Configuration</div>
          <Link href="/dashboard/settings" className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg">
             <LucideSettings size={20} />
             <span>Settings</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white shadow-sm flex items-center px-8 justify-between">
           <h1 className="text-lg font-semibold text-gray-700">Dashboard</h1>
           <div className="text-sm text-gray-500">Welcome back</div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
