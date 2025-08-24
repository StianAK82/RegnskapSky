import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div id="app-body" className="flex min-h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-shrink-0 border-r border-gray-200 bg-white sticky top-0 h-screen">
          <Sidebar />
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto max-w-full">
          {title && <TopBar title={title} subtitle={subtitle} />}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}