import { Users, Star } from 'lucide-react';
import { Card } from '../../../components/ui';
import type { RelationshipMap as RelationshipMapType } from '../types';

interface RelationshipMapProps {
  data: RelationshipMapType;
}

export function RelationshipMap({ data }: RelationshipMapProps) {
  const { pairs, hubs } = data;

  if (pairs.length === 0 && hubs.length === 0) {
    return (
      <div className="py-10 text-center text-sm font-body text-lios-gray-400">
        Nenhum dado de relacionamento disponível.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Interaction pairs */}
      {pairs.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-lios-green" />
            <h4 className="text-sm font-subtitle text-white">Interações frequentes</h4>
          </div>
          <div className="space-y-2">
            {pairs.slice(0, 10).map((pair, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2 border-b border-lios-border last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-subtitle text-white truncate max-w-24">
                      {pair.from}
                    </span>
                    <span className="text-[10px] font-body text-lios-gray-400">↔</span>
                    <span className="text-xs font-subtitle text-white truncate max-w-24">
                      {pair.to}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-xs font-subtitle text-lios-green">
                    {pair.count}
                  </span>
                  <p className="text-[10px] font-body text-lios-gray-400">interações</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Hubs */}
      {hubs.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Star size={16} className="text-lios-green" />
            <h4 className="text-sm font-subtitle text-white">Membros centrais</h4>
          </div>
          <div className="space-y-2">
            {hubs.slice(0, 10).map((hub, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-lios-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-lios-green/15 text-lios-green text-[10px] font-subtitle flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <span className="text-sm font-subtitle text-white">{hub.name}</span>
                    {hub.role && (
                      <p className="text-[10px] font-body text-lios-gray-400">{hub.role}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
