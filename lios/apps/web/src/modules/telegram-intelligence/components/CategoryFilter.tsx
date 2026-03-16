import { cn } from '../../../lib/utils';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../types';
import type { InsightCategory } from '../types';

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as InsightCategory[];

interface CategoryFilterProps {
  selected: InsightCategory | null;
  onChange: (category: InsightCategory | null) => void;
  counts?: Partial<Record<InsightCategory, number>>;
}

export function CategoryFilter({ selected, onChange, counts }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* All option */}
      <button
        onClick={() => onChange(null)}
        className={cn(
          'px-3 py-1.5 rounded-lg text-xs font-subtitle transition-colors border',
          selected === null
            ? 'bg-lios-green/20 text-lios-green border-lios-green/40'
            : 'bg-lios-surface text-lios-gray-400 border-lios-border hover:text-white hover:border-lios-border/60'
        )}
      >
        Todos
        {counts && (
          <span className="ml-1.5 opacity-70">
            {Object.values(counts).reduce((a, b) => a + (b ?? 0), 0)}
          </span>
        )}
      </button>

      {ALL_CATEGORIES.map((cat) => {
        const colors = CATEGORY_COLORS[cat];
        const isSelected = selected === cat;
        const count = counts?.[cat];

        return (
          <button
            key={cat}
            onClick={() => onChange(isSelected ? null : cat)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-subtitle transition-colors border',
              isSelected
                ? cn(colors.bg, colors.text, colors.border)
                : 'bg-lios-surface text-lios-gray-400 border-lios-border hover:text-white hover:border-lios-border/60'
            )}
          >
            {CATEGORY_LABELS[cat]}
            {count !== undefined && (
              <span className="ml-1.5 opacity-70">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
