import React from 'react';
import { Sparkles, Heart, RotateCcw } from 'lucide-react';
import { useGame } from '../../context/GameContext';

export const Header: React.FC = () => {
  const { step, setStep, pairs, deleteGroupWithPin } = useGame();

  const steps = [
    { num: 1, title: '1. Configuración' },
    { num: 2, title: '2. Enlace de Registro y Jugadores' },
    { num: 3, title: '3. Asignar Familiares' },
    { num: 4, title: '4. Sorteo y Sobres' },
  ];

  return (
    <header className="app-header">
      <div className="brand-badge">
        <Heart size={14} fill="#e11d48" color="#e11d48" />
        <span>Edición Especial Colombia 🇨🇴</span>
        <Sparkles size={14} color="#fbbf24" />
      </div>

      <h1 className="brand-title">Sorteo de Amor y Amistad</h1>
      <p className="brand-subtitle">
        Organiza tu juego de Amigo Secreto con presupuesto máximo, fecha colombiana,
        exclusiones familiares automáticas y entrega de sobres 100% privados por WhatsApp.
      </p>

      {/* Stepper Navigation */}
      <nav className="stepper-container" aria-label="Pasos del sorteo" style={{ marginTop: '1.75rem' }}>
        {steps.map(s => {
          const isCurrent = step === s.num;
          const isDone = step > s.num || (s.num < 4 && pairs !== null);
          return (
            <button
              key={s.num}
              type="button"
              className={`step-pill ${isCurrent ? 'active' : ''} ${isDone ? 'completed' : ''}`}
              onClick={() => {
                if (s.num < step || pairs) {
                  setStep(s.num);
                }
              }}
              style={{ cursor: s.num <= step || pairs ? 'pointer' : 'default' }}
            >
              <span className="step-number">{s.num}</span>
              <span>{s.title}</span>
            </button>
          );
        })}

        {pairs && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
            onClick={deleteGroupWithPin}
            title="Borrar grupo y reiniciar todo"
          >
            <RotateCcw size={14} />
            <span>Borrar Grupo</span>
          </button>
        )}
      </nav>
    </header>
  );
};
