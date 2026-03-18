import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar } from 'lucide-react';
import { useClasses } from '../hooks/useClasses';
import { STATUS_LABELS, STATUS_COLORS } from '../types';
import { cn } from '../../../lib/utils';

export default function ClassesPage() {
  const navigate = useNavigate();
  const { classes, loading, fetchClasses } = useClasses();

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  return (
    <div className="px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-heading text-white">Turmas</h2>
            <p className="text-sm font-body text-lios-gray-400 mt-1">{classes.length} turmas cadastradas</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl border border-lios-border bg-lios-surface h-40 animate-pulse" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <div className="rounded-xl border border-lios-border bg-lios-surface p-10 text-center">
            <p className="text-sm font-body text-lios-gray-400">Nenhuma turma criada ainda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map(cls => (
              <button
                key={cls.id}
                onClick={() => navigate(`/app/pedagogico/turmas/${cls.id}`)}
                className="rounded-xl border border-lios-border bg-lios-surface p-5 text-left hover:border-lios-green/30 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs font-caption text-lios-green font-bold">{cls.abbreviation}</span>
                    <h3 className="text-sm font-subtitle text-white mt-1 group-hover:text-lios-green transition-colors">{cls.name}</h3>
                  </div>
                  <span className={cn(
                    'text-[10px] font-caption px-2 py-0.5 rounded-full',
                    STATUS_COLORS[cls.status]?.bg, STATUS_COLORS[cls.status]?.text
                  )}>
                    {STATUS_LABELS[cls.status]}
                  </span>
                </div>

                {cls.product_name && (
                  <p className="text-xs font-body text-lios-gray-400 mb-3">{cls.product_name}</p>
                )}

                <div className="flex items-center gap-4 text-xs font-body text-lios-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Users size={13} /> {cls.student_count ?? 0} alunos
                  </span>
                  {cls.start_date && (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} /> {new Date(cls.start_date).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
