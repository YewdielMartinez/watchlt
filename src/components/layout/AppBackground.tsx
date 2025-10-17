import React from 'react';
import { useUI } from '../../contexts/UIContext';

const AppBackground: React.FC = () => {
  const { backgroundUrl } = useUI();

  return (
    <div className="fixed inset-0 -z-10">
      <div
        className="absolute inset-0 bg-center bg-cover opacity-40"
        style={{ backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined }}
      />
      {/* Overlay un poco más opaco para mejorar contraste del contenido */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/70" />
    </div>
  );
};

export default AppBackground;