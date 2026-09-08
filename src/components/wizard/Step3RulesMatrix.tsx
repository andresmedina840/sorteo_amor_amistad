import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles, ArrowLeft, ShieldAlert, Calendar, DollarSign, Shuffle, HeartCrack } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useGame } from '../../context/GameContext';
import { formatColombiaDateTime } from '../../core/domain/utils/dateFormatters';

export const Step3RulesMatrix: React.FC = () => {
  const { eventConfig, participants, executeDraw, setStep, errorMessage, clearError } = useGame();
  const [isDrawing, setIsDrawing] = useState(false);

  const handleStartDraw = async () => {
    setIsDrawing(true);
    clearError();

    // Animación visual de cálculo y sorteo
    setTimeout(async () => {
      const success = await executeDraw();
      setIsDrawing(false);
      if (success) {
        // Lanzar confeti festivo
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
        <h2 style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Sparkles color="#fbbf24" />
          <span>Auditoría de Familiares y Sorteo</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Revisa las exclusiones familiares asignadas a cada jugador antes de ejecutar el algoritmo de asignación.
        </p>
      </div>

      {/* Resumen del evento */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={14} color="#38bdf8" />
            <span>FECHA Y HORA DE ENTREGA (COLOMBIA)</span>
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fbbf24', marginTop: '0.3rem', fontFamily: 'monospace' }}>
            {formatColombiaDateTime(eventConfig.deliveryDateIso)}
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <DollarSign size={14} color="#4ade80" />
            <span>VALOR MÁXIMO DEL REGALO</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4ade80', marginTop: '0.3rem' }}>
            {eventConfig.getFormattedBudget()}
          </div>
        </div>
      </div>

      {/* Tabla / Matriz de exclusiones familiares por persona */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#fff' }}>
        Verificación de Familiares Excluidos y Destinatarios Posibles:
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '2rem' }}>
        {participants.map(giver => {
          const excludedMembers = participants.filter(
            receiver => giver.cannotGiftTo(receiver) && receiver.id !== giver.id
          );
          const validCandidates = participants.filter(
            receiver => !giver.cannotGiftTo(receiver)
          );

          return (
            <div
              key={giver.id}
              style={{
                background: 'rgba(13, 8, 22, 0.5)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1.1rem',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div>
                <strong style={{ color: '#fff', fontSize: '1.05rem' }}>{giver.name}</strong>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <HeartCrack size={12} color="#fb7185" />
                  <span style={{ color: '#fca5a5', fontWeight: 600 }}>Familiares (NO le saldrán):</span>{' '}
                  {excludedMembers.length > 0 ? (
                    <span style={{ color: '#fde68a' }}>
                      {excludedMembers.map(m => m.name).join(', ')}
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Ninguno asignado</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} color="#4ade80" />
                <span style={{ fontSize: '0.88rem', color: '#4ade80', fontWeight: 600 }}>
                  {validCandidates.length} candidatos posibles
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {errorMessage && (
        <div className="alert-box alert-error">
          <ShieldAlert size={20} />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Botón de Sorteo con animación */}
      <div style={{ textAlign: 'center', margin: '2rem 0 1rem' }}>
        <motion.button
          type="button"
          className="btn btn-gold"
          style={{ fontSize: '1.2rem', padding: '1.1rem 2.75rem' }}
          onClick={handleStartDraw}
          disabled={isDrawing}
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
              <Sparkles size={22} />
              <span>¡Realizar Sorteo Mágico de Amor y Amistad!</span>
            </>
          )}
        </motion.button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '1rem' }}>
        <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
          <ArrowLeft size={18} />
          <span>Volver a Jugadores y Familiares</span>
        </button>
      </div>
    </motion.div>
  );
};
