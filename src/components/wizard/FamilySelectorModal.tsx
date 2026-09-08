import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Check, ShieldCheck, HeartCrack, UserCheck } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { Participant } from '../../core/domain/entities/Participant';
import { showToast } from '../../core/domain/utils/alertUtils';

interface FamilySelectorModalProps {
  participant: Participant | null;
  onClose: () => void;
}

export const FamilySelectorModal: React.FC<FamilySelectorModalProps> = ({ participant, onClose }) => {
  const { participants, toggleFamilyExclusion } = useGame();

  if (!participant) return null;

  // Los demás participantes (excluyéndose a sí mismo)
  const otherParticipants = participants.filter(p => p.id !== participant.id);

  const handleToggle = (other: Participant) => {
    const willBeExcluded = !participant.cannotGiftTo(other);
    toggleFamilyExclusion(participant.id, other.id);

    if (willBeExcluded) {
      showToast(`${other.name} marcado como familiar de ${participant.name} (No se regalarán)`, 'info');
    } else {
      showToast(`Restricción eliminada entre ${participant.name} y ${other.name}`, 'success');
    }
  };

  const currentExcludedCount = otherParticipants.filter(p => participant.cannotGiftTo(p)).length;

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 2, 10, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          style={{
            background: 'linear-gradient(145deg, #1d0f2f 0%, #10081c 100%)',
            border: '2px solid rgba(225, 29, 72, 0.4)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            maxWidth: '560px',
            width: '100%',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px var(--primary-glow)',
            position: 'relative',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header del Modal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div>
              <div className="brand-badge" style={{ marginBottom: '0.4rem', fontSize: '0.78rem' }}>
                <ShieldCheck size={13} color="#fb7185" />
                <span>Asignación de Familiares</span>
              </div>
              <h3 style={{ fontSize: '1.5rem', color: '#fff' }}>
                Familiares de <span style={{ color: '#fb7185' }}>{participant.name}</span>
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                Marca a las personas que son sus familiares o pareja para que <strong>NO le salgan en el sorteo</strong> (ni él a ellos).
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.4rem', borderRadius: '50%', minWidth: '36px', height: '36px' }}
              onClick={onClose}
              aria-label="Cerrar modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Contador de exclusiones */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.65rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              fontSize: '0.85rem',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Familiares / Excluidos asignados:</span>
            <strong style={{ color: currentExcludedCount > 0 ? '#fb7185' : '#86efac' }}>
              {currentExcludedCount} de {otherParticipants.length} personas
            </strong>
          </div>

          {/* Lista de selección de familiares */}
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {otherParticipants.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                No hay otros participantes registrados para asignar como familiares.
              </p>
            ) : (
              otherParticipants.map(other => {
                const isExcluded = participant.cannotGiftTo(other);

                return (
                  <div
                    key={other.id}
                    onClick={() => handleToggle(other)}
                    style={{
                      background: isExcluded ? 'rgba(225, 29, 72, 0.15)' : 'rgba(13, 8, 22, 0.6)',
                      border: `1px solid ${isExcluded ? 'var(--primary)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem 1.1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: isExcluded ? 'rgba(225, 29, 72, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isExcluded ? '#fb7185' : 'var(--text-secondary)',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                        }}
                      >
                        {isExcluded ? <HeartCrack size={18} /> : <Users size={18} />}
                      </div>

                      <div>
                        <strong style={{ color: '#fff', fontSize: '1rem', display: 'block' }}>
                          {other.name}
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: isExcluded ? '#fca5a5' : '#86efac' }}>
                          {isExcluded ? '🚫 Es familiar (NO se regalarán)' : '✅ Puede salirle como amigo secreto'}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        border: `2px solid ${isExcluded ? 'var(--primary)' : 'rgba(255, 255, 255, 0.3)'}`,
                        background: isExcluded ? 'var(--primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isExcluded && <Check size={16} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Botón de cierre */}
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
              <UserCheck size={18} />
              <span>Guardar Asignación de Familiares</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
