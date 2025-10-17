import React from 'react';

type Props = {
  page: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
};

const PaginationGlass: React.FC<Props> = ({ page, canPrev, canNext, onPrev, onNext, className = '' }) => {
  return (
    <div className={`glass-panel p-2 rounded-xl flex items-center justify-center gap-3 ${className}`}>
      <button
        className={`px-4 py-2 rounded-full text-sm text-tertiary ${canPrev ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 opacity-50 cursor-not-allowed'}`}
        onClick={onPrev}
        disabled={!canPrev}
      >
        ← Anterior
      </button>
      <div className="px-4 py-2 rounded-full bg-white/10 text-tertiary text-sm">
        Página {page}
      </div>
      <button
        className={`px-4 py-2 rounded-full text-sm text-tertiary ${canNext ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 opacity-50 cursor-not-allowed'}`}
        onClick={onNext}
        disabled={!canNext}
      >
        Siguiente →
      </button>
    </div>
  );
};

export default PaginationGlass;