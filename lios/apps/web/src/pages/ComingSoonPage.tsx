import { Clock } from 'lucide-react';

export default function ComingSoonPage({ moduleName }: { moduleName?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-lios-surface-2 flex items-center justify-center mb-6">
        <Clock size={28} className="text-lios-gray-400" />
      </div>
      <h2 className="text-xl font-heading text-white mb-2">
        {moduleName ?? 'Módulo'} — Em breve
      </h2>
      <p className="text-sm font-body text-lios-gray-400 max-w-md">
        Este módulo está em desenvolvimento e estará disponível em breve.
      </p>
    </div>
  );
}
