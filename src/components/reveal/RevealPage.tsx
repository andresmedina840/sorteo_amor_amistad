import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, DollarSign, Calendar, Gift, CheckCircle2, Lock, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import { WebCryptoService } from '../../infrastructure/services/WebCryptoService';
import type { SecretRevealPayload } from '../../core/domain/services/ICryptoService';
import { formatColombiaDateTime, getTimeRemaining } from '../../core/domain/utils/dateFormatters';
import { showToast } from '../../core/domain/utils/alertUtils';

interface RevealPageProps {
  token: string;
  onGoHome: () => void;
}

export const RevealPage: React.FC<RevealPageProps> = ({ token, onGoHome }) => {
  const cryptoService = useMemo(() => new WebCryptoService(), []);
  const [payload, setPayload] = useState<SecretRevealPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevealed, setIsRevealed] = useState(false);
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number; isPast: boolean }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
  });

  // Decodificar el token al montar el componente
  useEffect(() => {
    let isMounted = true;
    cryptoService.decodePayload(token).then(decoded => {
      if (isMounted) {
        setPayload(decoded);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [token, cryptoService]);

  // Actualizar contador regresivo en vivo cada segundo
  useEffect(() => {
    if (!payload?.deliveryDateIso) return;

    const updateTimer = () => {
      setCountdown(getTimeRemaining(payload.deliveryDateIso));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [payload?.deliveryDateIso]);

  const handleOpenEnvelope = () => {
    if (isRevealed) return;
    setIsRevealed(true);

    // Explosión de confeti en cascada
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#e11d48', '#fb7185', '#fbbf24', '#ffffff', '#ec4899'],
    });

    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#fbbf24', '#e11d48'],
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#fbbf24', '#ec4899'],
      });
    }, 250);

    showToast('¡Sobre abierto! Guarda bien este secreto 🤫', 'success');
  };

  if (isLoading) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{ display: 'inline-block', marginBottom: '1rem' }}
        >
          <Sparkles size={36} color="#fbbf24" />
        </motion.div>
        <h2>Descifrando tu sobre secreto...</h2>
        <p style={{ color: 'var(--text-muted)' }}>Validando credenciales criptográficas de Amor y Amistad.</p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
        <div style={{ color: '#f87171', marginBottom: '1rem' }}>
          <Lock size={48} style={{ margin: '0 auto' }} />
        </div>
        <h2 style={{ color: '#f87171' }}>Enlace no válido o incompleto</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0.75rem auto 1.5rem' }}>
          El enlace de revelación no contiene un token válido o fue modificado. Solicita a tu organizador que te reenvíe el enlace oficial por WhatsApp.
        </p>
        <button type="button" className="btn btn-primary" onClick={onGoHome}>
          <ArrowLeft size={16} />
          <span>Ir a la página principal</span>
        </button>
      </div>
    );
  }

  return (
    <motion.div
      className="glass-panel"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      style={{ maxWidth: '680px', margin: '0 auto' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <div className="brand-badge">
          <Heart size={13} fill="#e11d48" color="#e11d48" />
          <span>Sorteo Oficial de Amor y Amistad</span>
        </div>
        <h1 style={{ fontSize: '2.2rem', marginTop: '0.25rem' }}>{payload.eventTitle}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginTop: '0.2rem' }}>
          ¡Hola, <strong style={{ color: '#fb7185' }}>{payload.giverName}</strong>! Tienes un sobre confidencial esperando por ti.
        </p>
      </div>

      {/* Reglas del Evento: Presupuesto y Fecha de Colombia */}
      <div
        style={{
          background: 'rgba(13, 8, 22, 0.7)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <DollarSign size={14} color="#4ade80" />
              <span>VALOR MÁXIMO DEL REGALO</span>
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4ade80', marginTop: '0.2rem' }}>
              {new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(payload.maxBudget)} {payload.currency}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={14} color="#38bdf8" />
              <span>ENTREGA EN COLOMBIA (dd/mm/yyyy hh:mm:ss am/pm)</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24', marginTop: '0.2rem', fontFamily: 'monospace' }}>
              {formatColombiaDateTime(payload.deliveryDateIso)}
            </div>
          </div>
        </div>

        {/* Contador Regresivo */}
        {!countdown.isPast && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
            <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
              Tiempo restante para la entrega
            </div>
            <div className="countdown-grid">
              <div className="countdown-box">
                <div className="countdown-val">{countdown.days}</div>
                <div className="countdown-lbl">Días</div>
              </div>
              <div className="countdown-box">
                <div className="countdown-val">{countdown.hours.toString().padStart(2, '0')}</div>
                <div className="countdown-lbl">Horas</div>
              </div>
              <div className="countdown-box">
                <div className="countdown-val">{countdown.minutes.toString().padStart(2, '0')}</div>
                <div className="countdown-lbl">Min</div>
              </div>
              <div className="countdown-box">
                <div className="countdown-val">{countdown.seconds.toString().padStart(2, '0')}</div>
                <div className="countdown-lbl">Seg</div>
              </div>
            </div>
          </div>
        )}

        {payload.notes && (
          <div style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
            📍 <strong>Lugar / Indicaciones:</strong> {payload.notes}
          </div>
        )}
      </div>

      {/* Sobre Mágico Interactivo con Framer Motion */}
      <div className="envelope-wrapper">
        <AnimatePresence mode="wait">
          {!isRevealed ? (
            <motion.div
              key="closed-envelope"
              className="envelope-card"
              onClick={handleOpenEnvelope}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0, y: -20 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="wax-seal">
                <Heart fill="#fbbf24" size={38} color="#b45309" />
              </div>
              <h3 style={{ fontSize: '1.4rem', color: '#fbbf24', marginBottom: '0.5rem' }}>
                Sobre Confidencial
              </h3>
              <p style={{ color: '#fbcfe8', fontSize: '0.95rem', margin: '0 auto', maxWidth: '340px' }}>
                Exclusivo para <strong>{payload.giverName}</strong>. Toca el sobre para romper el sello y descubrir a tu amigo secreto.
              </p>
              <div style={{ marginTop: '1.5rem' }}>
                <span className="btn btn-gold" style={{ fontSize: '0.9rem', padding: '0.65rem 1.4rem' }}>
                  <Sparkles size={16} />
                  <span>¡Toca aquí para Abrir!</span>
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="opened-letter"
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 120 }}
              style={{
                width: '100%',
                maxWidth: '520px',
                background: 'linear-gradient(135deg, #1f0d2b 0%, #13081c 100%)',
                border: '2px solid #fbbf24',
                borderRadius: 'var(--radius-xl)',
                padding: '2.5rem 2rem',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 35px rgba(251, 191, 36, 0.25)',
                textAlign: 'center',
              }}
            >
              <div style={{ color: '#fb7185', fontSize: '0.95rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🎉 ¡Tu Amigo Secreto Asignado es! 🎉
              </div>

              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.1, 1] }}
                transition={{ duration: 0.5, delay: 0.2 }}
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  color: '#fbbf24',
                  margin: '1.25rem 0',
                  textShadow: '0 0 20px rgba(251, 191, 36, 0.5)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {payload.receiverName}
              </motion.div>

              {payload.receiverWish ? (
                <div
                  style={{
                    background: 'rgba(251, 191, 36, 0.08)',
                    border: '1px solid rgba(251, 191, 36, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    margin: '1.25rem 0',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                    <Gift size={15} />
                    <span>SUGERENCIAS O GUSTOS DE {payload.receiverName.toUpperCase()}:</span>
                  </div>
                  <div style={{ color: '#fde68a', fontSize: '0.95rem' }}>
                    "{payload.receiverWish}"
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '1rem 0' }}>
                  (No especificó gustos particulares, ¡sorpréndele con tu creatividad!)
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#86efac', fontSize: '0.88rem', marginTop: '1.5rem' }}>
                <CheckCircle2 size={16} />
                <span>Asignación validada sin familiares</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onGoHome} style={{ fontSize: '0.85rem' }}>
          <ArrowLeft size={15} />
          <span>Crear o Administrar otro Sorteo</span>
        </button>
      </div>
    </motion.div>
  );
};
