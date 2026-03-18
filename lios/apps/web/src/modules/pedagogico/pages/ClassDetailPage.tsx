import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Calendar } from 'lucide-react';
import { useClasses } from '../hooks/useClasses';
import { STATUS_LABELS, STATUS_COLORS } from '../types';
import type { PedClass } from '../types';
import { cn } from '../../../lib/utils';

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchClass } = useClasses();

  const [cls, setCls] = useState<PedClass | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchClass(id).then(data => {
      setCls(data);
      setLoading(false);
    });
  }, [id, fetchClass]);

  if (loading) {
    return (
      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="rounded-xl border border-lios-border bg-lios-surface h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!cls) {
    return (
      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto text-center py-20">
          <p className="text-sm font-body text-lios-gray-400">Turma não encontrada</p>
          <button onClick={() => navigate('/app/pedagogico/turmas')} className="text-sm font-subtitle text-lios-green mt-2 hover:underline">
            Voltar para turmas
          </button>
        </div>
      </div>
    );
  }

  const enrollments = cls.ped_enrollments ?? [];
  const activeStudents = enrollments.filter(e => ['active', 'accessed'].includes(e.status));

  return (
    <div className="px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/app/pedagogico/turmas')} className="flex items-center gap-2 text-sm font-subtitle text-lios-gray-400 hover:text-white transition-colors mb-4">
          <ArrowLeft size={16} /> Voltar
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-heading text-lios-green">[{cls.abbreviation}]</span>
              <h2 className="text-2xl font-heading text-white">{cls.name}</h2>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className={cn(
                'text-xs font-caption px-2 py-0.5 rounded-full',
                STATUS_COLORS[cls.status]?.bg, STATUS_COLORS[cls.status]?.text
              )}>
                {STATUS_LABELS[cls.status]}
              </span>
              {cls.product_name && <span className="text-xs font-body text-lios-gray-400">{cls.product_name}</span>}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-lios-border bg-lios-surface p-4 text-center">
            <Users size={18} className="mx-auto mb-1 text-lios-green" />
            <p className="text-lg font-heading text-white">{activeStudents.length}</p>
            <p className="text-xs font-body text-lios-gray-400">Alunos Ativos</p>
          </div>
          <div className="rounded-xl border border-lios-border bg-lios-surface p-4 text-center">
            <Users size={18} className="mx-auto mb-1 text-lios-gray-400" />
            <p className="text-lg font-heading text-white">{enrollments.length}</p>
            <p className="text-xs font-body text-lios-gray-400">Total Matrículas</p>
          </div>
          {cls.start_date && (
            <div className="rounded-xl border border-lios-border bg-lios-surface p-4 text-center">
              <Calendar size={18} className="mx-auto mb-1 text-blue-400" />
              <p className="text-sm font-heading text-white">{new Date(cls.start_date).toLocaleDateString('pt-BR')}</p>
              <p className="text-xs font-body text-lios-gray-400">Início</p>
            </div>
          )}
          {cls.end_date && (
            <div className="rounded-xl border border-lios-border bg-lios-surface p-4 text-center">
              <Calendar size={18} className="mx-auto mb-1 text-orange-400" />
              <p className="text-sm font-heading text-white">{new Date(cls.end_date).toLocaleDateString('pt-BR')}</p>
              <p className="text-xs font-body text-lios-gray-400">Término</p>
            </div>
          )}
        </div>

        {/* Students table */}
        <div className="rounded-xl border border-lios-border bg-lios-surface overflow-hidden">
          <div className="px-5 py-4 border-b border-lios-border">
            <h3 className="text-sm font-subtitle text-lios-gray-400 uppercase tracking-wider">Alunos da Turma</h3>
          </div>
          {enrollments.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-body text-lios-gray-400">Nenhum aluno matriculado nesta turma</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-lios-border">
                  <th className="px-5 py-3 text-xs font-subtitle text-lios-gray-400 uppercase tracking-wider">Nome</th>
                  <th className="px-5 py-3 text-xs font-subtitle text-lios-gray-400 uppercase tracking-wider hidden sm:table-cell">Email</th>
                  <th className="px-5 py-3 text-xs font-subtitle text-lios-gray-400 uppercase tracking-wider hidden md:table-cell">Data Compra</th>
                  <th className="px-5 py-3 text-xs font-subtitle text-lios-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lios-border">
                {enrollments.map(enrollment => {
                  const student = enrollment.ped_students;
                  return (
                    <tr
                      key={enrollment.id}
                      onClick={() => student && navigate(`/app/pedagogico/alunos/${student.id}`)}
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3">
                        <p className="text-sm font-subtitle text-white">{student?.full_name ?? '—'}</p>
                      </td>
                      <td className="px-5 py-3 text-sm font-body text-lios-gray-300 hidden sm:table-cell">{student?.email ?? '—'}</td>
                      <td className="px-5 py-3 text-sm font-body text-lios-gray-300 hidden md:table-cell">
                        {enrollment.purchase_date ? new Date(enrollment.purchase_date).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          'text-[10px] font-caption px-2 py-0.5 rounded-full',
                          STATUS_COLORS[enrollment.status]?.bg, STATUS_COLORS[enrollment.status]?.text
                        )}>
                          {STATUS_LABELS[enrollment.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
