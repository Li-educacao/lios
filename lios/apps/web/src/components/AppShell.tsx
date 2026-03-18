import { useState, type ReactNode } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { cn } from '../lib/utils';
import {
  Target,
  Palette,
  Image,
  BarChart3,
  FileText,
  BookOpen,
  Users,
  Layers,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Settings,
  Lock,
  Brain,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────────────────── */

type SectorColor = 'blue' | 'green';

interface NavModule {
  label: string;
  path: string;
  icon: ReactNode;
  permission?: string; // module:action format
  comingSoon?: boolean;
}

interface NavGroup {
  label: string;
  sector: SectorColor;
  modules: NavModule[];
}

/* ─── Navigation config ──────────────────────────────────────────────────────── */

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Marketing',
    sector: 'blue',
    modules: [
      { label: 'Social Media', path: '/app/social-media', icon: <Layers size={18} />, permission: 'social-media:read' },
      { label: 'Campanhas', path: '/app/campanhas', icon: <Target size={18} />, comingSoon: true },
      { label: 'Criativos', path: '/app/criativos', icon: <Palette size={18} />, comingSoon: true },
      { label: 'Mídias', path: '/app/midias', icon: <Image size={18} />, comingSoon: true },
      { label: 'Métricas', path: '/app/metricas', icon: <BarChart3 size={18} />, comingSoon: true },
      { label: 'Relatórios', path: '/app/marketing/relatorios', icon: <FileText size={18} />, comingSoon: true },
    ],
  },
  {
    label: 'Pedagógico',
    sector: 'green',
    modules: [
      { label: 'Cursos', path: '/app/cursos', icon: <BookOpen size={18} />, comingSoon: true },
      { label: 'Inteligência Telegram', path: '/app/alunos/inteligencia', icon: <Brain size={18} />, permission: 'pedagogico:read' },
      { label: 'Alunos', path: '/app/pedagogico', icon: <Users size={18} />, permission: 'pedagogico:read' },
      { label: 'Conteúdo', path: '/app/conteudo', icon: <FileText size={18} />, comingSoon: true },
      { label: 'Relatórios', path: '/app/pedagogico/relatorios', icon: <BarChart3 size={18} />, comingSoon: true },
    ],
  },
];

/* ─── SidebarGroup ───────────────────────────────────────────────────────────── */

function SidebarGroup({
  group,
  expanded,
  onToggle,
  currentPath,
  onNavigate,
  hasPermission,
}: {
  group: NavGroup;
  expanded: boolean;
  onToggle: () => void;
  currentPath: string;
  onNavigate: (path: string) => void;
  hasPermission: (module: string, action: string) => boolean;
}) {
  const sectorColors = {
    blue: {
      label: 'text-lios-blue',
      activeBg: 'bg-[rgba(0,132,200,0.12)]',
      activeText: 'text-lios-blue',
      hoverBorder: 'hover:border-lios-blue/20',
    },
    green: {
      label: 'text-lios-green',
      activeBg: 'bg-[rgba(0,179,126,0.12)]',
      activeText: 'text-lios-green',
      hoverBorder: 'hover:border-lios-green/20',
    },
  };

  const colors = sectorColors[group.sector];

  return (
    <div className="mb-2">
      {/* Group header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 group"
      >
        <span className="text-xs font-subtitle uppercase tracking-wider text-lios-gray-400">
          {group.label}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            'text-lios-gray-400 transition-transform duration-200',
            !expanded && '-rotate-90'
          )}
        />
      </button>

      {/* Group items */}
      {expanded && (
        <div className="space-y-0.5 px-2">
          {group.modules.map((mod) => {
            const isActive = currentPath.startsWith(mod.path);
            const [permModule, permAction] = (mod.permission ?? '').split(':');
            const allowed = !mod.permission || hasPermission(permModule, permAction);
            const disabled = mod.comingSoon || !allowed;

            return (
              <button
                key={mod.path}
                onClick={() => !disabled && onNavigate(mod.path)}
                disabled={disabled}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-subtitle transition-colors text-left',
                  isActive && !disabled
                    ? cn(colors.activeBg, colors.activeText)
                    : disabled
                    ? 'text-lios-gray-400/40 cursor-not-allowed'
                    : 'text-lios-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <span className={cn('shrink-0', isActive && !disabled ? colors.activeText : disabled ? 'text-lios-gray-400/40' : 'text-lios-gray-400')}>
                  {mod.icon}
                </span>
                <span className="flex-1">{mod.label}</span>
                {mod.comingSoon && (
                  <span className="text-[10px] font-caption px-1.5 py-0.5 rounded bg-lios-surface-2 text-lios-gray-400/60">
                    Em breve
                  </span>
                )}
                {!allowed && !mod.comingSoon && (
                  <Lock size={12} className="text-lios-gray-400/40" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Breadcrumb ─────────────────────────────────────────────────────────────── */

function Breadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.replace('/app', '').split('/').filter(Boolean);

  const labels: Record<string, { label: string; color?: string }> = {
    'social-media': { label: 'Social Media', color: 'text-lios-blue' },
    'new': { label: 'Novo Carrossel' },
    'templates': { label: 'Templates' },
    'feedback': { label: 'Aprendizado' },
    'settings': { label: 'Configurações' },
    'campanhas': { label: 'Campanhas', color: 'text-lios-blue' },
    'criativos': { label: 'Criativos', color: 'text-lios-blue' },
    'midias': { label: 'Mídias', color: 'text-lios-blue' },
    'metricas': { label: 'Métricas', color: 'text-lios-blue' },
    'cursos':        { label: 'Cursos', color: 'text-lios-green' },
    'pedagogico':    { label: 'Pedagógico', color: 'text-lios-green' },
    'alunos':        { label: 'Alunos', color: 'text-lios-green' },
    'turmas':        { label: 'Turmas', color: 'text-lios-green' },
    'inteligencia':  { label: 'Inteligência Telegram', color: 'text-lios-green' },
    'conteudo':      { label: 'Conteúdo', color: 'text-lios-green' },
    'admin': { label: 'Admin' },
  };

  if (segments.length === 0) {
    return <span className="text-sm font-subtitle text-white">Dashboard</span>;
  }

  return (
    <div className="flex items-center gap-1.5 text-sm">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const info = labels[seg];
        const label = info?.label ?? seg;

        return (
          <span key={seg} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={14} className="text-lios-gray-400" />}
            <span className={cn(
              'font-subtitle',
              isLast ? 'text-white' : info?.color ?? 'text-lios-gray-400'
            )}>
              {label}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/* ─── AppShell ───────────────────────────────────────────────────────────────── */

export default function AppShell() {
  const { user, signOut } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Marketing: true,
    'Pedagógico': true,
  });

  function toggleGroup(label: string) {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  function handleNavigate(path: string) {
    navigate(path);
    setSidebarOpen(false);
  }

  const initials = user?.email?.substring(0, 2).toUpperCase() ?? '??';

  return (
    <div className="min-h-screen bg-lios-black flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-60 bg-lios-surface border-r border-lios-border flex flex-col transition-transform duration-200',
          'lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-14 px-4 flex items-center border-b border-lios-border">
          <Link to="/app" className="text-lg font-heading text-lios-blue tracking-tight">
            LIOS
          </Link>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <SidebarGroup
              key={group.label}
              group={group}
              expanded={expandedGroups[group.label] ?? true}
              onToggle={() => toggleGroup(group.label)}
              currentPath={location.pathname}
              onNavigate={handleNavigate}
              hasPermission={hasPermission}
            />
          ))}

          {/* Admin section */}
          {isAdmin && (
            <div className="mt-4 px-2">
              <div className="border-t border-lios-border pt-4 mb-2 px-1">
                <span className="text-xs font-subtitle uppercase tracking-wider text-lios-gray-400">
                  Administração
                </span>
              </div>
              <button
                onClick={() => handleNavigate('/app/admin')}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-subtitle transition-colors text-left',
                  location.pathname.startsWith('/app/admin')
                    ? 'bg-white/10 text-white'
                    : 'text-lios-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <Settings size={18} className="shrink-0" />
                Usuários
              </button>
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-lios-border">
          <div className="flex items-center gap-3 px-1 mb-3">
            <div className="w-8 h-8 rounded-full bg-lios-surface-2 flex items-center justify-center shrink-0">
              <span className="text-xs font-subtitle text-lios-gray-300">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-subtitle text-white truncate">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
              <p className="text-xs font-body text-lios-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-subtitle text-lios-gray-400 hover:text-lios-red hover:bg-lios-red/10 transition-colors text-left"
          >
            <LogOut size={18} className="shrink-0" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 flex items-center gap-4 px-4 sm:px-6 bg-lios-surface border-b border-lios-border shrink-0">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-lios-gray-400 hover:text-white transition-colors"
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>

          {/* Breadcrumb */}
          <Breadcrumb pathname={location.pathname} />

          {/* User dropdown (desktop) */}
          <div className="ml-auto hidden sm:flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-lios-surface-2 flex items-center justify-center">
              <span className="text-xs font-subtitle text-lios-gray-300">{initials}</span>
            </div>
            <span className="text-sm font-subtitle text-white">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-lios-black">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
