import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, UserCheck, HeartCrack, Sparkles, ArrowLeft, Shuffle, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useGame } from '../../context/GameContext';
import { FamilySelectorModal } from './FamilySelectorModal';
import type { Participant } from '../../core/domain/entities/Participant';

export const Step3AssignFamilies: React.FC = () => {
  const { participants, toggleFamilyExclusion, executeDraw, setStep, feasibility, errorMessage, clearError } = useGame();
  const [selectedParticipantForFamily, setSelectedParticipantForFamily] = useState<Participant | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleStartDraw = async () => {
    setIsDrawing(true);
    clearError();

    setTimeout(async () => {
      const success = await executeDraw();
      setIsDrawing(false);
      if (success) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#e11d48', '#fb7185', '#fbbf24', '#ffffff', '#ec4899'],
        });
      }
    }, 1200);
  };

  return (
    <motion.div
      className="glass-panel"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <div className="brand-badge" style={{ marginBottom: '0.4rem' }}>
          <ShieldCheck size={14} color="#fb7185" />
          <span>Fase de Restricciones Familiares</span>
        </div>
        <h2 style={{ fontSize: '1.65rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span>Asignar Familiares y Parejas</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Con todos los jugadores registrados, elige a cada persona y <strong>asígnale cuáles son sus familiares</strong> para que 
          <strong> NO le salgan en el sorteo</strong> (ni ellos a él/ella).
        </p>
      </div>

      {/* Selector rápido de jugador */}
      <div
        style={{
          background: 'rgba(225, 29, 72, 0.08)',
          border: '1px solid rgba(225, 29, 72, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Elige un jugador para abrir su lista de familiares:
        </div>

        <select
          className="form-select"
          style={{ maxWidth: '280px', padding: '0.55rem 0.9rem', fontSize: '0.9rem', color: '#fbbf24', fontWeight: 600 }}
          onChange={e => {
            const target = participants.find(p => p.id === e.target.value);
            if (target) setSelectedParticipantForFamily(target);
          }}
          value=""
        >
          <option value="">-- Seleccionar jugador --</option>
          {participants.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tarjetas de Jugadores con gestión de familiares */}
      <div className="participants-list" style={{ marginBottom: '2rem' }}>
        <AnimatePresence>
          {participants.map((p, index) => {
            const assignedFamilyMembers = participants.filter(other => p.cannotGiftTo(other) && other.id !== p.id);
            const validCandidatesCount = participants.filter(other => !p.cannotGiftTo(other)).length;

            return (
              <motion.div
                key={p.id}
                className="participant-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                style={{
                  border: assignedFamilyMembers.length > 0 ? '1px solid rgba(225, 29, 72, 0.4)' : '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '1.15rem', color: '#fff' }}>
                      {index + 1}. {p.name}
                    </strong>
                    <div style={{ fontSize: '0.78rem', color: validCandidatesCount > 0 ? '#86efac' : '#f87171', marginTop: '0.2rem' }}>
                      {validCandidatesCount > 0 ? `✅ ${validCandidatesCount} candidatos posibles` : '⚠️ Sin destinatarios posibles'}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                    onClick={() => setSelectedParticipantForFamily(p)}
                  >
                    <UserCheck size={14} />
                    <span>Asignar Familiares</span>
                  </button>
                </div>

                {/* Lista visual de familiares asignados a este jugador */}
                <div style={{ marginTop: '0.9rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem' }}>
                    <HeartCrack size={13} color="#fb7185" />
                    <span>Familiares asignados (NO le saldrán):</span>
                  </div>

                  {assignedFamilyMembers.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {assignedFamilyMembers.map(fam => (
                        <span
                          key={fam.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: 'rgba(225, 29, 72, 0.22)',
                            border: '1px solid rgba(225, 29, 72, 0.45)',
                            borderRadius: 'var(--radius-full)',
                            padding: '0.2rem 0.6rem',
                            fontSize: '0.78rem',
                            color: '#fbcfe8',
                          }}
                        >
                          <span>🚫 {fam.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleFamilyExclusion(p.id, fam.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#f87171',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '0.9rem',
                              lineHeight: 1,
                            }}
                            title={`Remover a ${fam.name} como familiar`}
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      Sin restricciones familiares (cualquiera puede ser su amigo secreto)
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Alerta de viabilidad matemática */}
      {!feasibility.isFeasible && (
        <div className="alert-box alert-warning" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Aviso de Restricciones:</strong> {feasibility.reason}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={20} />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Botón de Sorteo Mágico con animación */}
      <div style={{ textAlign: 'center', margin: '2rem 0 1rem' }}>
        <motion.button
          type="button"
          className="btn btn-gold"
          style={{ fontSize: '1.25rem', padding: '1.1rem 2.8rem' }}
          onClick={handleStartDraw}
          disabled={isDrawing || !feasibility.isFeasible}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {isDrawing ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                style={{ display: 'inline-block' }}
              >
                <Shuffle size={24} />
              </motion.span>
              <span>Mezclando amigos secretos y aplicando exclusiones...</span>
            </>
          ) : (
            <>
              <Sparkles size={24} />
              <span>¡Realizar Sorteo Mágico de Amor y Amistad!</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Modal de asignación de familiares */}
      <FamilySelectorModal
        participant={selectedParticipantForFamily}
        onClose={() => setSelectedParticipantForFamily(null)}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '1.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
          <ArrowLeft size={18} />
          <span>Volver a Convocatoria de Jugadores</span>
        </button>
      </div>
    </motion.div>
  );
};
