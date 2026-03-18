import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, BookOpen, TrendingUp } from 'lucide-react';
import { useStudents } from '../hooks/useStudents';
import { useClasses } from '../hooks/useClasses';
import { STATUS_LABELS, STATUS_COLORS } from '../types';
import { cn } from '../../../lib/utils';

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl border border-lios-border bg-lios-surface p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', color)}>
          <Icon size={18} className="text-white" />
        </div>
        <span className="text-xs font-subtitle text-lios-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-heading text-white">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { students, total: totalStudents, loading: loadingStudents, fetchStudents } = useStudents();
  const { classes, loading: loadingClasses, fetchClasses } = useClasses();

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, [fetchStudents, fetchClasses]);

  const loading = loadingStudents || loadingClasses;
  const activeStudents = students.filter(s => s.status === 'active').length;
  const activeClasses = classes.filter(c => c.status === 'active').length;
  const recentStudents = students.slice(0, 5);

  return (
    <div className="px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-heading text-white">Dashboard Pedagógico</h2>
          <p className="text-sm font-body text-lios-gray-400 mt-1">Visão geral de alunos, turmas e matrículas</p>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl border border-lios-border bg-lios-surface h-24 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <StatCard icon={Users} label="Total Alunos" value={totalStudents} color="bg-lios-green/20" />
            <StatCard icon={TrendingUp} label="Alunos Ativos" value={activeStudents} color="bg-emerald-500/20" />
            <StatCard icon={GraduationCap} label="Turmas Ativas" value={activeClasses} color="bg-blue-500/20" />
            <StatCard icon={BookOpen} label="Total Turmas" value={classes.length} color="bg-purple-500/20" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent students */}
          <div className="rounded-xl border border-lios-border bg-lios-surface">
            <div className="flex items-center justify-between px-5 py-4 border-b border-lios-border">
              <h3 className="text-sm font-subtitle text-white">Alunos Recentes</h3>
              <button
                onClick={() => navigate('/app/pedagogico/alunos')}
                className="text-xs font-subtitle text-lios-green hover:text-lios-green/80 transition-colors"
              >
                Ver todos
              </button>
            </div>
            <div className="divide-y divide-lios-border">
              {loading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="px-5 py-3 h-14 animate-pulse" />
                ))
              ) : recentStudents.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm font-body text-lios-gray-400">Nenhum aluno cadastrado ainda</p>
                </div>
              ) : (
                recentStudents.map(student => (
                  <button
                    key={student.id}
                    onClick={() => navigate(`/app/pedagogico/alunos/${student.id}`)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-subtitle text-white">{student.full_name}</p>
                      <p className="text-xs font-body text-lios-gray-400">{student.email}</p>
                    </div>
                    <span className={cn(
                      'text-[10px] font-caption px-2 py-0.5 rounded-full',
                      STATUS_COLORS[student.status]?.bg ?? 'bg-gray-500/15',
                      STATUS_COLORS[student.status]?.text ?? 'text-gray-400'
                    )}>
                      {STATUS_LABELS[student.status] ?? student.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Classes overview */}
          <div className="rounded-xl border border-lios-border bg-lios-surface">
            <div className="flex items-center justify-between px-5 py-4 border-b border-lios-border">
              <h3 className="text-sm font-subtitle text-white">Turmas</h3>
              <button
                onClick={() => navigate('/app/pedagogico/turmas')}
                className="text-xs font-subtitle text-lios-green hover:text-lios-green/80 transition-colors"
              >
                Ver todas
              </button>
            </div>
            <div className="divide-y divide-lios-border">
              {loading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="px-5 py-3 h-14 animate-pulse" />
                ))
              ) : classes.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm font-body text-lios-gray-400">Nenhuma turma criada ainda</p>
                </div>
              ) : (
                classes.map(cls => (
                  <button
                    key={cls.id}
                    onClick={() => navigate(`/app/pedagogico/turmas/${cls.id}`)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-subtitle text-white">
                        <span className="text-lios-green">[{cls.abbreviation}]</span> {cls.name}
                      </p>
                      <p className="text-xs font-body text-lios-gray-400">{cls.product_name ?? 'Sem produto vinculado'}</p>
                    </div>
                    <span className="text-xs font-caption text-lios-gray-400">
                      {cls.student_count ?? 0} alunos
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
