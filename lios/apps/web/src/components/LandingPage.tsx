import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  Palette,
  BarChart3,
  BookOpen,
  Users,
  Layers,
  Shield,
  Zap,
  Building2,
  MonitorSmartphone,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui';

/* ─── Navbar ─────────────────────────────────────────────────────────────────── */

function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function scrollTo(id: string) {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-lios-surface/80 backdrop-blur-md border-b border-lios-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-full flex items-center justify-between">
        {/* Logo */}
        <span className="text-lg font-heading text-lios-blue tracking-tight">LIOS</span>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <button onClick={() => scrollTo('sobre')} className="text-sm font-subtitle text-lios-gray-400 hover:text-white transition-colors">
            Sobre
          </button>
          <button onClick={() => scrollTo('setores')} className="text-sm font-subtitle text-lios-gray-400 hover:text-white transition-colors">
            Setores
          </button>
          <button onClick={() => scrollTo('beneficios')} className="text-sm font-subtitle text-lios-gray-400 hover:text-white transition-colors">
            Benefícios
          </button>
        </div>

        {/* CTA + mobile menu */}
        <div className="flex items-center gap-3">
          <Button size="sm" variant="primary" onClick={() => navigate('/login')}>
            Entrar
          </Button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-lios-gray-400 hover:text-white transition-colors"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-lios-surface border-b border-lios-border px-4 py-4 space-y-3">
          <button onClick={() => scrollTo('sobre')} className="block w-full text-left text-sm font-subtitle text-lios-gray-400 hover:text-white py-2">
            Sobre
          </button>
          <button onClick={() => scrollTo('setores')} className="block w-full text-left text-sm font-subtitle text-lios-gray-400 hover:text-white py-2">
            Setores
          </button>
          <button onClick={() => scrollTo('beneficios')} className="block w-full text-left text-sm font-subtitle text-lios-gray-400 hover:text-white py-2">
            Benefícios
          </button>
        </div>
      )}
    </nav>
  );
}

/* ─── Hero Section ───────────────────────────────────────────────────────────── */

function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-lios-black bg-grid-pattern overflow-hidden">
      {/* Decorative floating cards */}
      <div className="absolute left-[5%] top-[30%] hidden lg:block glass-card rounded-2xl p-5 w-52 rotate-[-6deg] opacity-60">
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-lios-blue" />
          <span className="text-xs font-subtitle text-lios-gray-300">Campanhas</span>
        </div>
        <div className="text-2xl font-heading text-white">12</div>
        <div className="text-xs font-body text-lios-gray-400 mt-1">Ativas este mês</div>
        <div className="mt-3 h-1.5 rounded-full bg-lios-surface-2 overflow-hidden">
          <div className="h-full w-3/4 rounded-full bg-lios-blue" />
        </div>
      </div>

      <div className="absolute right-[5%] top-[35%] hidden lg:block glass-card rounded-2xl p-5 w-52 rotate-[4deg] opacity-60">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-lios-green" />
          <span className="text-xs font-subtitle text-lios-gray-300">Pedagógico</span>
        </div>
        <div className="text-2xl font-heading text-white">847</div>
        <div className="text-xs font-body text-lios-gray-400 mt-1">Alunos ativos</div>
        <div className="mt-3 h-1.5 rounded-full bg-lios-surface-2 overflow-hidden">
          <div className="h-full w-4/5 rounded-full bg-lios-green" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-lios-blue/30 bg-lios-blue/5 mb-8">
          <span className="text-xs font-subtitle text-lios-blue">LI Educação Online</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-heading text-white leading-[1.1] mb-6">
          Operações internas na velocidade da{' '}
          <span className="text-lios-blue">educação moderna</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg font-body text-lios-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
          O LIOS centraliza Marketing e Pedagógico em um único lugar.
          Toda a operação da sua equipe, integrada e acessível.
        </p>

        {/* CTA */}
        <Button
          size="lg"
          variant="primary"
          onClick={() => navigate('/login')}
          className="shadow-[0_0_20px_rgba(0,132,200,0.25)] hover:shadow-[0_0_30px_rgba(0,132,200,0.4)] transition-shadow"
        >
          Acessar plataforma
          <ChevronRight size={18} className="ml-1" />
        </Button>
      </div>
    </section>
  );
}

/* ─── Sobre Section ──────────────────────────────────────────────────────────── */

function SobreSection() {
  return (
    <section id="sobre" className="bg-lios-surface py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-lios-border bg-lios-surface-2 mb-4">
            <span className="text-xs font-subtitle text-lios-gray-300">Quem somos</span>
          </div>
          <h2 className="text-3xl lg:text-[2.5rem] font-heading text-white mb-4">
            LI Educação Online
          </h2>
          <p className="text-lg font-body text-lios-gray-400 max-w-2xl mx-auto">
            Somos uma empresa de educação online que conecta gestão, pedagogia e marketing
            em uma operação integrada e eficiente.
          </p>
        </div>

        {/* Sector cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Marketing */}
          <div className="rounded-xl border border-lios-blue-dark/40 bg-lios-surface-2 p-6 hover:border-lios-blue/40 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-lios-blue/10 flex items-center justify-center mb-4">
              <Target size={20} className="text-lios-blue" />
            </div>
            <h3 className="text-xl font-heading text-white mb-2">Marketing</h3>
            <p className="text-sm font-body text-lios-gray-400 leading-relaxed">
              Campanhas, criativos, tráfego pago e análise de métricas.
              Tudo para escalar a aquisição de alunos.
            </p>
          </div>

          {/* Pedagógico */}
          <div className="rounded-xl border border-lios-green-dark/40 bg-lios-surface-2 p-6 hover:border-lios-green/40 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-lios-green/10 flex items-center justify-center mb-4">
              <BookOpen size={20} className="text-lios-green" />
            </div>
            <h3 className="text-xl font-heading text-white mb-2">Pedagógico</h3>
            <p className="text-sm font-body text-lios-gray-400 leading-relaxed">
              Conteúdo, cursos, acompanhamento de alunos e relatórios
              de aprendizado em um só painel.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Setores Section ────────────────────────────────────────────────────────── */

function SetoresSection() {
  return (
    <section id="setores" className="bg-lios-black py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Marketing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lios-blue/10 border border-lios-blue/20 mb-4">
              <Target size={14} className="text-lios-blue" />
              <span className="text-xs font-subtitle text-lios-blue">Marketing</span>
            </div>
            <h3 className="text-2xl lg:text-[2rem] font-heading text-white mb-4">
              Controle total do tráfego pago e criativos
            </h3>
            <p className="text-base font-body text-lios-gray-400 leading-relaxed">
              Gerencie campanhas, analise métricas e produza criativos sem sair da plataforma.
              Integração direta com Meta e Google Ads.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { icon: <Target size={18} />, label: 'Gestão de campanhas' },
              { icon: <Palette size={18} />, label: 'Biblioteca de criativos' },
              { icon: <BarChart3 size={18} />, label: 'Análise de métricas' },
              { icon: <Layers size={18} />, label: 'Integração Meta / Google' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4 p-4 rounded-lg border border-lios-border bg-lios-surface hover:border-lios-blue/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-lios-blue/10 flex items-center justify-center shrink-0 text-lios-blue">
                  {item.icon}
                </div>
                <span className="text-sm font-subtitle text-white">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pedagógico */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 space-y-3">
            {[
              { icon: <BookOpen size={18} />, label: 'Gestão de cursos' },
              { icon: <Users size={18} />, label: 'Acompanhamento de alunos' },
              { icon: <LayoutDashboard size={18} />, label: 'Criação de conteúdo' },
              { icon: <BarChart3 size={18} />, label: 'Relatórios de aprendizado' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4 p-4 rounded-lg border border-lios-border bg-lios-surface hover:border-lios-green/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-lios-green/10 flex items-center justify-center shrink-0 text-lios-green">
                  {item.icon}
                </div>
                <span className="text-sm font-subtitle text-white">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lios-green/10 border border-lios-green/20 mb-4">
              <BookOpen size={14} className="text-lios-green" />
              <span className="text-xs font-subtitle text-lios-green">Pedagógico</span>
            </div>
            <h3 className="text-2xl lg:text-[2rem] font-heading text-white mb-4">
              Tudo que sua equipe pedagógica precisa
            </h3>
            <p className="text-base font-body text-lios-gray-400 leading-relaxed">
              Organize cursos, acompanhe o progresso dos alunos e produza conteúdo educacional
              de forma colaborativa.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Benefícios Section ─────────────────────────────────────────────────────── */

function BeneficiosSection() {
  const features = [
    {
      icon: <Building2 size={24} />,
      title: 'Tudo em um lugar',
      description: 'Marketing e Pedagógico centralizados numa única plataforma.',
    },
    {
      icon: <Shield size={24} />,
      title: 'Acesso por setor',
      description: 'Cada equipe vê apenas o que precisa. Permissões granulares por módulo.',
    },
    {
      icon: <Zap size={24} />,
      title: 'Rápido e moderno',
      description: 'Interface responsiva e rápida, feita para produtividade.',
    },
    {
      icon: <MonitorSmartphone size={24} />,
      title: 'Acesse de qualquer lugar',
      description: 'Desktop, tablet ou celular. A plataforma se adapta ao seu dispositivo.',
    },
  ];

  return (
    <section id="beneficios" className="bg-lios-surface py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-[2.5rem] font-heading text-white mb-4">
            Por que usar o LIOS?
          </h2>
          <p className="text-lg font-body text-lios-gray-400">
            Feito sob medida para a operação da LI Educação.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-lios-border bg-lios-black p-6 text-center hover:border-lios-blue/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-lios-blue/10 flex items-center justify-center mx-auto mb-4 text-lios-blue">
                {feature.icon}
              </div>
              <h4 className="text-base font-heading text-white mb-2">{feature.title}</h4>
              <p className="text-sm font-body text-lios-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA Section ────────────────────────────────────────────────────────────── */

function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="bg-lios-black py-16 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 text-center">
        <h2 className="text-3xl lg:text-[2.5rem] font-heading text-white mb-4">
          Pronto para começar?
        </h2>
        <p className="text-lg font-body text-lios-gray-400 mb-10">
          Acesse a plataforma com sua conta.
        </p>
        <Button
          size="lg"
          variant="primary"
          onClick={() => navigate('/login')}
          className="shadow-[0_0_20px_rgba(0,132,200,0.25)] hover:shadow-[0_0_30px_rgba(0,132,200,0.4)] transition-shadow"
        >
          Entrar no LIOS
          <ChevronRight size={18} className="ml-1" />
        </Button>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="bg-lios-surface border-t border-lios-border py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-sm font-subtitle text-white">LI Educação Online</span>
        </div>
        <p className="text-xs font-body text-lios-gray-400">
          &copy; 2026 LI Educação Online. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}

/* ─── Landing Page ───────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-lios-black">
      <Navbar />
      <HeroSection />
      <SobreSection />
      <SetoresSection />
      <BeneficiosSection />
      <CTASection />
      <Footer />
    </div>
  );
}
