import { BarChart3 } from 'lucide-react';
import type { TgDailyVolume } from '../types';

/* ─── DailyVolume ────────────────────────────────────────────────────────── */

interface DailyVolumeProps {
  days: TgDailyVolume[];
}

export function DailyVolume({ days }: DailyVolumeProps) {
  if (!days || days.length === 0) return null;

  const totalQuestions = days.reduce((s, d) => s + d.questions, 0);
  const totalResponses = days.reduce((s, d) => s + d.responses, 0);
  const totalMsgs = days.reduce((s, d) => s + d.total, 0);
  const avgPerDay = Math.round(totalMsgs / days.length);
  const avgQuestionsPerDay = Math.round(totalQuestions / days.length);
  const avgResponsesPerDay = Math.round(totalResponses / days.length);
  const maxQuestions = Math.max(...days.map((d) => d.questions), 1);
  const maxResponses = Math.max(...days.map((d) => d.responses), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Questions chart */}
      <div className="rounded-xl border border-lios-border bg-lios-surface p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-lios-green shrink-0" />
            <h3 className="text-base font-subtitle text-white">Perguntas dos Alunos</h3>
            <span className="text-xs font-body text-lios-gray-400">({days.length} dias)</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-body">
            <span className="text-lios-gray-400">
              Média: <span className="text-white font-subtitle">{avgQuestionsPerDay}</span>/dia
            </span>
            <span className="text-lios-gray-400">
              Total: <span className="text-lios-green font-subtitle">{totalQuestions}</span>
            </span>
          </div>
        </div>

        <div className="flex items-end gap-1.5" style={{ height: 120 }}>
          {days.map((day) => {
            const pct = maxQuestions > 0 ? (day.questions / maxQuestions) * 100 : 0;
            const isWeekend = day.weekday === 'Sáb' || day.weekday === 'Dom';

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1 group"
                title={`${day.date} (${day.weekday})\nPerguntas: ${day.questions}\nTotal msgs: ${day.total}`}
              >
                <span className="text-[10px] font-subtitle text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  {day.questions}
                </span>
                <div
                  className="w-full rounded-t-sm bg-lios-green transition-all"
                  style={{ height: `${Math.max(pct, 2)}%` }}
                />
                <span
                  className={`text-[10px] font-body ${
                    isWeekend ? 'text-lios-gray-600' : 'text-lios-gray-400'
                  }`}
                >
                  {day.weekday}
                </span>
                <span className="text-[9px] font-body text-lios-gray-600">
                  {day.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Responses chart */}
      <div className="rounded-xl border border-lios-border bg-lios-surface p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-lios-blue shrink-0" />
            <h3 className="text-base font-subtitle text-white">Respostas do Suporte</h3>
            <span className="text-xs font-body text-lios-gray-400">({days.length} dias)</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-body">
            <span className="text-lios-gray-400">
              Média: <span className="text-white font-subtitle">{avgResponsesPerDay}</span>/dia
            </span>
            <span className="text-lios-gray-400">
              Total: <span className="text-lios-blue font-subtitle">{totalResponses}</span>
            </span>
          </div>
        </div>

        <div className="flex items-end gap-1.5" style={{ height: 120 }}>
          {days.map((day) => {
            const pct = maxResponses > 0 ? (day.responses / maxResponses) * 100 : 0;
            const isWeekend = day.weekday === 'Sáb' || day.weekday === 'Dom';

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1 group"
                title={`${day.date} (${day.weekday})\nRespostas: ${day.responses}\nTotal msgs: ${day.total}`}
              >
                <span className="text-[10px] font-subtitle text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  {day.responses}
                </span>
                <div
                  className="w-full rounded-t-sm bg-lios-blue transition-all"
                  style={{ height: `${Math.max(pct, 2)}%` }}
                />
                <span
                  className={`text-[10px] font-body ${
                    isWeekend ? 'text-lios-gray-600' : 'text-lios-gray-400'
                  }`}
                >
                  {day.weekday}
                </span>
                <span className="text-[9px] font-body text-lios-gray-600">
                  {day.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Summary footer */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-lios-border">
          <span className="text-xs font-body text-lios-gray-400">
            Média geral: <span className="text-white font-subtitle">{avgPerDay}</span> msgs/dia
          </span>
          <span className="text-xs font-body text-lios-gray-400">
            Taxa resposta: <span className="text-white font-subtitle">
              {totalQuestions > 0 ? Math.round((totalResponses / totalQuestions) * 100) : 0}%
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
