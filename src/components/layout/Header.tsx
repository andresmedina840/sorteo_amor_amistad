import React, { useState } from 'react';
import { Sparkles, Heart, RotateCcw, FolderKanban } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { GroupManagerModal } from '../modals/GroupManagerModal';
import { showToast } from '../../core/domain/utils/alertUtils';

export const Header: React.FC = () => {
  const { step, setStep, pairs, eventConfig, deleteGroupWithPin, participants } = useGame();
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const steps = [
    { num: 1, title: '1. Configuración' },
    { num: 2, title: '2. Enlace de Registro y Jugadores' },
    { num: 3, title: '3. Asignar Familiares' },
    { num: 4, title: '4. Sorteo y Sobres' },
  ];

  return (
    <header className="app-header">
      {/* Barra superior de herramientas: Selección de grupo y estado de Base de Datos */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          maxWidth: '100%',
          margin: '0 auto 1.25rem',
          padding: '0.5rem 1rem',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: '0.6rem',
        }}
      >
        <button
          type="button"
          onClick={() => setIsGroupModalOpen(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
          title="Ver o cambiar de grupo"
        >
          <FolderKanban size={16} color="var(--primary)" />
          <span style={{ color: 'var(--text-muted)' }}>Grupo activo:</span>
          <span style={{ color: '#fb7185', textDecoration: 'underline dotted' }}>{eventConfig.title || 'Amor y Amistad 2026'}</span>
          <span style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Cambiar o crear grupo</span>
        </button>
      </div>

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
                if (s.num === 1 || s.num === 2) {
                  setStep(s.num);
                } else if (s.num === 3) {
                  if (participants.length < 2) {
                    showToast('Registra al menos 2 jugadores para poder asignar familiares', 'warning');
                    return;
                  }
                  setStep(3);
                } else if (s.num === 4) {
                  if (participants.length < 3) {
                    showToast('Se requieren al menos 3 jugadores para realizar el sorteo', 'warning');
                    return;
                  }
                  setStep(4);
                }
              }}
              style={{ cursor: 'pointer' }}
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

      {/* Modal de Gestión de Grupos */}
      <GroupManagerModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
      />
    </header>
  );
};
