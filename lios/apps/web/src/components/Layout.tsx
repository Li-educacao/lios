import { useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { LayoutDashboard, PlusCircle, Layout as LayoutIcon, MessageSquare, Settings, LogOut, Menu, X } from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={18} /> },
  { label: 'Novo Carrossel', path: '/new', icon: <PlusCircle size={18} /> },
  { label: 'Templates', path: '/templates', icon: <LayoutIcon size={18} /> },
  { label: 'Aprendizado', path: '/feedback', icon: <MessageSquare size={18} /> },
  { label: 'Configuracoes', path: '/settings', icon: <Settings size={18} /> },
];

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => {
        navigate(item.path);
        onClick?.();
      }}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-subtitle transition-colors text-left',
        active
          ? 'bg-brand-blue/15 text-brand-blue'
          : 'text-brand-gray hover:text-white hover:bg-white/5'
      )}
    >
      <span className={cn('shrink-0', active ? 'text-brand-blue' : 'text-brand-gray')}>
        {item.icon}
      </span>
      {item.label}
    </button>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function isActive(path: string): boolean {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-brand-black flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-60 bg-[#080808] border-r border-brand-gray/10 flex flex-col transition-transform duration-200',
          'lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b border-brand-gray/10">
          <span className="text-lg font-heading text-brand-blue">Carousel Creator</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              item={item}
              active={isActive(item.path)}
              onClick={closeSidebar}
            />
          ))}
        </nav>

        {/* User info */}
        <div className="px-3 py-4 border-t border-brand-gray/10">
          {user && (
            <div className="mb-2 px-3">
              <p className="text-xs font-body text-brand-gray truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-subtitle text-brand-gray hover:text-red-400 hover:bg-red-500/10 transition-colors text-left"
          >
            <LogOut size={18} className="shrink-0" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-brand-gray/10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-brand-gray hover:text-white transition-colors"
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
          <span className="text-base font-heading text-brand-blue">Carousel Creator</span>
          {sidebarOpen && (
            <button
              onClick={closeSidebar}
              className="ml-auto text-brand-gray hover:text-white transition-colors"
              aria-label="Fechar menu"
            >
              <X size={22} />
            </button>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
