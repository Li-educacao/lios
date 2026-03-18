import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useStudents } from '../hooks/useStudents';
import { useClasses } from '../hooks/useClasses';
import { STATUS_LABELS, STATUS_COLORS } from '../types';
import { cn } from '../../../lib/utils';

export default function StudentsPage() {
  const navigate = useNavigate();
  const { students, total, loading, fetchStudents } = useStudents();
  const { classes, fetchClasses } = useClasses();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents({ search: search || undefined, status: statusFilter || undefined, class_id: classFilter || undefined, page });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, classFilter, page, fetchStudents]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-heading text-white">Alunos</h2>
            <p className="text-sm font-body text-lios-gray-400 mt-1">{total} alunos cadastrados</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-lios-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-lios-surface border border-lios-border text-sm font-body text-white placeholder:text-lios-gray-400 focus:outline-none focus:border-lios-green/50"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-lg bg-lios-surface border border-lios-border text-sm font-body text-white focus:outline-none focus:border-lios-green/50"
            >
              <option value="">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="cancelled">Cancelado</option>
              <option value="refunded">Reembolsado</option>
            </select>
            <select
              value={classFilter}
              onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-lg bg-lios-surface border border-lios-border text-sm font-body text-white focus:outline-none focus:border-lios-green/50"
            >
              <option value="">Todas as turmas</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>[{cls.abbreviation}] {cls.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-lios-border bg-lios-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-lios-border">
                  <th className="px-5 py-3 text-xs font-subtitle text-lios-gray-400 uppercase tracking-wider">Nome</th>
                  <th className="px-5 py-3 text-xs font-subtitle text-lios-gray-400 uppercase tracking-wider hidden sm:table-cell">Email</th>
                  <th className="px-5 py-3 text-xs font-subtitle text-lios-gray-400 uppercase tracking-wider hidden md:table-cell">Telefone</th>
                  <th className="px-5 py-3 text-xs font-subtitle text-lios-gray-400 uppercase tracking-wider hidden lg:table-cell">Turma(s)</th>
                  <th className="px-5 py-3 text-xs font-subtitle text-lios-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lios-border">
                {loading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <tr key={i}>
                      <td colSpan={5} className="px-5 py-4"><div className="h-5 bg-lios-surface-2 rounded animate-pulse" /></td>
                    </tr>
                  ))
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center">
                      <p className="text-sm font-body text-lios-gray-400">
                        {search || statusFilter || classFilter ? 'Nenhum aluno encontrado com esses filtros' : 'Nenhum aluno cadastrado ainda'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  students.map(student => {
                    const enrollments = student.ped_enrollments ?? [];
                    const classNames = enrollments
                      .map(e => e.ped_classes?.abbreviation)
                      .filter(Boolean)
                      .join(', ');

                    return (
                      <tr
                        key={student.id}
                        onClick={() => navigate(`/app/pedagogico/alunos/${student.id}`)}
                        className="hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3">
                          <p className="text-sm font-subtitle text-white">{student.full_name}</p>
                          <p className="text-xs font-body text-lios-gray-400 sm:hidden">{student.email}</p>
                        </td>
                        <td className="px-5 py-3 text-sm font-body text-lios-gray-300 hidden sm:table-cell">{student.email}</td>
                        <td className="px-5 py-3 text-sm font-body text-lios-gray-300 hidden md:table-cell">{student.phone ?? '—'}</td>
                        <td className="px-5 py-3 hidden lg:table-cell">
                          {classNames ? (
                            <span className="text-xs font-caption text-lios-green">{classNames}</span>
                          ) : (
                            <span className="text-xs font-caption text-lios-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn(
                            'text-[10px] font-caption px-2 py-0.5 rounded-full',
                            STATUS_COLORS[student.status]?.bg ?? 'bg-gray-500/15',
                            STATUS_COLORS[student.status]?.text ?? 'text-gray-400'
                          )}>
                            {STATUS_LABELS[student.status] ?? student.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-lios-border">
              <span className="text-xs font-body text-lios-gray-400">
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg bg-lios-surface-2 text-xs font-subtitle text-white disabled:text-lios-gray-400/40 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-lios-surface-2 text-xs font-subtitle text-white disabled:text-lios-gray-400/40 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
