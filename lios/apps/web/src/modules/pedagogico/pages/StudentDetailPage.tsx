import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, FileText, Edit2, Save, X } from 'lucide-react';
import { useStudents } from '../hooks/useStudents';
import { useToast } from '../../../contexts/ToastContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { STATUS_LABELS, STATUS_COLORS } from '../types';
import type { Student } from '../types';
import { cn } from '../../../lib/utils';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { hasPermission } = usePermissions();
  const { fetchStudent, updateStudent } = useStudents();
  const canEdit = hasPermission('pedagogico', 'write');

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Student>>({});

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchStudent(id).then(data => {
      setStudent(data);
      setLoading(false);
    });
  }, [id, fetchStudent]);

  async function handleSave() {
    if (!id || !student) return;
    const success = await updateStudent(id, editData);
    if (success) {
      setStudent({ ...student, ...editData } as Student);
      setEditing(false);
      setEditData({});
      addToast('Aluno atualizado com sucesso', 'success');
    } else {
      addToast('Erro ao atualizar aluno', 'error');
    }
  }

  if (loading) {
    return (
      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-lios-border bg-lios-surface h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto text-center py-20">
          <p className="text-sm font-body text-lios-gray-400">Aluno não encontrado</p>
          <button onClick={() => navigate('/app/pedagogico/alunos')} className="text-sm font-subtitle text-lios-green mt-2 hover:underline">
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  const enrollments = student.ped_enrollments ?? [];
  const contracts = student.ped_contracts ?? [];

  return (
    <div className="px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Back + Header */}
        <button onClick={() => navigate('/app/pedagogico/alunos')} className="flex items-center gap-2 text-sm font-subtitle text-lios-gray-400 hover:text-white transition-colors mb-4">
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-heading text-white">{student.full_name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className={cn(
                'text-xs font-caption px-2 py-0.5 rounded-full',
                STATUS_COLORS[student.status]?.bg, STATUS_COLORS[student.status]?.text
              )}>
                {STATUS_LABELS[student.status]}
              </span>
              <span className="text-xs font-body text-lios-gray-400">
                Cadastrado em {new Date(student.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
          {canEdit && !editing && (
            <button onClick={() => { setEditing(true); setEditData({ full_name: student.full_name, phone: student.phone ?? '', notes: student.notes ?? '' }); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-lios-surface-2 text-sm font-subtitle text-white hover:bg-white/10 transition-colors"
            >
              <Edit2 size={14} /> Editar
            </button>
          )}
          {editing && (
            <div className="flex gap-2">
              <button onClick={handleSave} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-lios-green/20 text-sm font-subtitle text-lios-green hover:bg-lios-green/30 transition-colors">
                <Save size={14} /> Salvar
              </button>
              <button onClick={() => { setEditing(false); setEditData({}); }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-lios-surface-2 text-sm font-subtitle text-lios-gray-400 hover:bg-white/10 transition-colors">
                <X size={14} /> Cancelar
              </button>
            </div>
          )}
        </div>

        {/* Info card */}
        <div className="rounded-xl border border-lios-border bg-lios-surface p-5 mb-6">
          <h3 className="text-sm font-subtitle text-lios-gray-400 uppercase tracking-wider mb-4">Dados Pessoais</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-caption text-lios-gray-400">Nome Completo</label>
              {editing ? (
                <input value={editData.full_name ?? ''} onChange={e => setEditData(d => ({ ...d, full_name: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-lios-surface-2 border border-lios-border text-sm text-white focus:outline-none focus:border-lios-green/50" />
              ) : (
                <p className="text-sm font-subtitle text-white mt-1">{student.full_name}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-caption text-lios-gray-400">Email</label>
              <p className="text-sm font-body text-white mt-1 flex items-center gap-2"><Mail size={14} className="text-lios-gray-400" />{student.email}</p>
            </div>
            <div>
              <label className="text-xs font-caption text-lios-gray-400">Telefone</label>
              {editing ? (
                <input value={editData.phone ?? ''} onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-lios-surface-2 border border-lios-border text-sm text-white focus:outline-none focus:border-lios-green/50" />
              ) : (
                <p className="text-sm font-body text-white mt-1 flex items-center gap-2"><Phone size={14} className="text-lios-gray-400" />{student.phone ?? '—'}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-caption text-lios-gray-400">CPF</label>
              <p className="text-sm font-body text-white mt-1">{student.cpf ?? '—'}</p>
            </div>
          </div>
          {editing && (
            <div className="mt-4">
              <label className="text-xs font-caption text-lios-gray-400">Observações</label>
              <textarea value={editData.notes ?? ''} onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))} rows={3}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-lios-surface-2 border border-lios-border text-sm text-white focus:outline-none focus:border-lios-green/50 resize-none" />
            </div>
          )}
          {!editing && student.notes && (
            <div className="mt-4">
              <label className="text-xs font-caption text-lios-gray-400">Observações</label>
              <p className="text-sm font-body text-lios-gray-300 mt-1">{student.notes}</p>
            </div>
          )}
        </div>

        {/* Enrollments */}
        <div className="rounded-xl border border-lios-border bg-lios-surface mb-6">
          <div className="px-5 py-4 border-b border-lios-border">
            <h3 className="text-sm font-subtitle text-lios-gray-400 uppercase tracking-wider">Matrículas ({enrollments.length})</h3>
          </div>
          {enrollments.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-body text-lios-gray-400">Nenhuma matrícula encontrada</p>
            </div>
          ) : (
            <div className="divide-y divide-lios-border">
              {enrollments.map(enrollment => (
                <div key={enrollment.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-subtitle text-white">
                      <span className="text-lios-green">[{enrollment.ped_classes?.abbreviation}]</span>{' '}
                      {enrollment.ped_classes?.name ?? 'Turma desconhecida'}
                    </p>
                    <p className="text-xs font-body text-lios-gray-400">
                      {enrollment.purchase_date ? new Date(enrollment.purchase_date).toLocaleDateString('pt-BR') : '—'}
                      {enrollment.amount_paid ? ` · R$ ${enrollment.amount_paid.toFixed(2)}` : ''}
                    </p>
                  </div>
                  <span className={cn(
                    'text-[10px] font-caption px-2 py-0.5 rounded-full',
                    STATUS_COLORS[enrollment.status]?.bg, STATUS_COLORS[enrollment.status]?.text
                  )}>
                    {STATUS_LABELS[enrollment.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contracts (placeholder for Epic 4) */}
        <div className="rounded-xl border border-lios-border bg-lios-surface">
          <div className="px-5 py-4 border-b border-lios-border">
            <h3 className="text-sm font-subtitle text-lios-gray-400 uppercase tracking-wider">Contratos ({contracts.length})</h3>
          </div>
          {contracts.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <FileText size={24} className="mx-auto mb-2 text-lios-gray-400/40" />
              <p className="text-sm font-body text-lios-gray-400">Contratos serão gerenciados aqui em breve</p>
            </div>
          ) : (
            <div className="divide-y divide-lios-border">
              {contracts.map(contract => (
                <div key={contract.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-subtitle text-white">Contrato</p>
                    <p className="text-xs font-body text-lios-gray-400">{new Date(contract.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className={cn(
                    'text-[10px] font-caption px-2 py-0.5 rounded-full',
                    STATUS_COLORS[contract.status]?.bg, STATUS_COLORS[contract.status]?.text
                  )}>
                    {STATUS_LABELS[contract.status] ?? contract.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
