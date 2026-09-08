import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Sparkles, DollarSign, Calendar, Gift, CheckCircle2, Lock,
  ArrowLeft, Key, Eye, EyeOff, ShieldCheck, AlertCircle, Users, ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { WebCryptoService } from '../../infrastructure/services/WebCryptoService';
import type { GroupRevealPayload, GroupRevealEntry } from '../../core/domain/services/ICryptoService';
import { formatColombiaDateTime, getTimeRemaining } from '../../core/domain/utils/dateFormatters';
import { showToast } from '../../core/domain/utils/alertUtils';

// ─── Fases del flujo de revelación ─────────────────────────────────────
type RevealPhase = 'LOADING' | 'SELECT_NAME' | 'ENTER_PIN' | 'REVEALED' | 'ERROR';

const PHASES: Record<string, RevealPhase> = {
  LOADING: 'LOADING',
  SELECT_NAME: 'SELECT_NAME',
  ENTER_PIN: 'ENTER_PIN',
  REVEALED: 'REVEALED',
  ERROR: 'ERROR',
} as const;

// ─── Props ─────────────────────────────────────────────────────────────
interface GroupRevealPageProps {
  token: string;
  onGoHome: () => void;
}

// ─── Constantes ────────────────────────────────────────────────────────
const MAX_PIN_ATTEMPTS = 5;

// ─── Variantes de animación (framer-motion) ────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.96 },
};

const cardVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.85 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

/**
 * Página de Revelación Grupal.
 * Un único enlace para todos los participantes del sorteo.
 * Flujo: Seleccionar nombre → Ingresar PIN → Revelar amigo secreto.
 *
 * Principios aplicados:
 * - SRP: cada fase es un bloque renderizado separado
 * - OCP: las fases se manejan con enum, fácil de extender
 * - DIP: depende de la abstracción ICryptoService vía WebCryptoService
 */
export const GroupRevealPage: React.FC<GroupRevealPageProps> = ({ token, onGoHome }) => {
  const cryptoService = useMemo(() => new WebCryptoService(), []);

  // ─── Estado del flujo ──────────────────────────────────────────────
  const [phase, setPhase] = useState<RevealPhase>(PHASES.LOADING);
  const [payload, setPayload] = useState<GroupRevealPayload | null>(null);

  // ─── Selección de participante ─────────────────────────────────────
  const [selectedEntry, setSelectedEntry] = useState<GroupRevealEntry | null>(null);

  // ─── PIN ───────────────────────────────────────────────────────────
  const [enteredPin, setEnteredPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinAttempts, setPinAttempts] = useState(0);

  // ─── Contador regresivo ────────────────────────────────────────────
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });

  // ─── Decodificar token al montar ───────────────────────────────────
  useEffect(() => {
    cryptoService.decodeGroupPayload(token).then(decoded => {
      if (decoded && decoded.entries.length > 0) {
        setPayload(decoded);
        setPhase(PHASES.SELECT_NAME);
      } else {
        setPhase(PHASES.ERROR);
      }
    });
  }, [token, cryptoService]);

  // ─── Actualizar contador regresivo ─────────────────────────────────
  useEffect(() => {
    if (!payload?.deliveryDateIso) return;
    const update = () => setCountdown(getTimeRemaining(payload.deliveryDateIso));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [payload?.deliveryDateIso]);

  // ─── Handlers ──────────────────────────────────────────────────────
  const handleSelectParticipant = (entry: GroupRevealEntry) => {
    setSelectedEntry(entry);
    setEnteredPin('');
    setPinError('');
    setPinAttempts(0);
    setShowPin(false);
    setPhase(PHASES.ENTER_PIN);
  };

  const handleBackToNames = () => {
    setSelectedEntry(null);
    setEnteredPin('');
    setPinError('');
    setPinAttempts(0);
    setPhase(PHASES.SELECT_NAME);
  };

  const handleVerifyPin = () => {
    if (!selectedEntry) return;

    if (pinAttempts >= MAX_PIN_ATTEMPTS) {
      setPinError(`Superaste los ${MAX_PIN_ATTEMPTS} intentos. Contacta al organizador.`);
      return;
    }

    const trimmed = enteredPin.trim();
    if (!trimmed || trimmed.length < 4) {
      setPinError('Ingresa tu PIN completo de 4 dígitos');
      return;
    }

    // Verificar PIN (si el participante no tenía PIN, aceptar cualquiera de 4 dígitos)
    const realPin = (selectedEntry.giverPin || '').trim();
    const isValid = realPin ? trimmed === realPin : trimmed.length === 4;

    if (isValid) {
      setPhase(PHASES.REVEALED);
      launchConfetti();
      showToast('¡Sobre abierto! Guarda bien este secreto 🤫', 'success');
    } else {
      const newAttempts = pinAttempts + 1;
      setPinAttempts(newAttempts);
      const remaining = MAX_PIN_ATTEMPTS - newAttempts;
      setPinError(
        remaining > 0
          ? `PIN incorrecto. Te quedan ${remaining} intento${remaining === 1 ? '' : 's'}.`
          : `Superaste los ${MAX_PIN_ATTEMPTS} intentos. Contacta al organizador.`
      );
      setEnteredPin('');
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleVerifyPin();
  };

  const handleCloseEnvelope = () => {
    setSelectedEntry(null);
    setEnteredPin('');
    setPinError('');
    setPinAttempts(0);
    setPhase(PHASES.SELECT_NAME);
  };

  // ─── Confetti premium ──────────────────────────────────────────────
  const launchConfetti = () => {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#e11d48', '#fb7185', '#fbbf24', '#22c55e', '#38bdf8'] });
    setTimeout(() => {
      confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#fbbf24', '#e11d48'] });
      confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#fbbf24', '#ec4899'] });
    }, 300);
  };

  // ═══════════════════════════════════════════════════════════════════
  // FASE: CARGANDO
  // ═══════════════════════════════════════════════════════════════════
  if (phase === PHASES.LOADING) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block', marginBottom: '1rem' }}>
          <Sparkles size={36} color="#fbbf24" />
        </motion.div>
        <h2>Descifrando el sorteo...</h2>
        <p style={{ color: 'var(--text-muted)' }}>Validando credenciales criptográficas de Amor y Amistad.</p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // FASE: ERROR / ENLACE INVÁLIDO
  // ═══════════════════════════════════════════════════════════════════
  if (phase === PHASES.ERROR || !payload) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
        <div style={{ color: '#f87171', marginBottom: '1rem' }}>
          <Lock size={48} style={{ margin: '0 auto' }} />
        </div>
        <h2 style={{ color: '#f87171' }}>Enlace no válido o incompleto</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0.75rem auto 1.5rem' }}>
          El enlace de revelación no contiene un token válido o fue modificado. Solicita al organizador que te reenvíe el enlace.
        </p>
        <button type="button" className="btn btn-primary" onClick={onGoHome}>
          <ArrowLeft size={16} />
          <span>Ir a la página principal</span>
        </button>
      </div>
    );
  }

  // ─── Encabezado compartido ─────────────────────────────────────────
  const EventHeader = () => (
    <div style={{ textAlign: 'center', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.25rem' }}>
      <div className="brand-badge" style={{ margin: '0 auto 0.5rem' }}>
        <Heart size={13} fill="#e11d48" color="#e11d48" />
        <span>Sobres Digitales Secretos</span>
        <Sparkles size={13} color="#fbbf24" />
      </div>
      <h1 style={{ fontSize: '1.85rem', margin: '0.25rem 0' }}>{payload.eventTitle}</h1>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', marginTop: '0.75rem', flexWrap: 'wrap', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <DollarSign size={15} color="#fbbf24" />
          <span>Presupuesto: <strong style={{ color: '#fbbf24' }}>${new Intl.NumberFormat('es-CO').format(payload.maxBudget)} {payload.currency}</strong></span>
        </span>
        {payload.deliveryDateIso && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={15} color="#38bdf8" />
            <span>Entrega: <strong style={{ color: '#38bdf8' }}>{formatColombiaDateTime(payload.deliveryDateIso)}</strong></span>
          </span>
        )}
      </div>

      {/* Contador Regresivo */}
      {!countdown.isPast && (
        <div style={{ marginTop: '1rem' }}>
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
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════
  // FASE: SELECCIONAR NOMBRE
  // ═══════════════════════════════════════════════════════════════════
  if (phase === PHASES.SELECT_NAME) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1rem' }}>
        <motion.div className="glass-panel" {...pageVariants} transition={{ duration: 0.35 }}>
          <EventHeader />

          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.98rem', marginBottom: '1.5rem' }}>
            <Users size={16} style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />
            Selecciona tu nombre para abrir tu sobre digital de forma privada.
          </p>

          <motion.div variants={staggerContainer} initial="initial" animate="animate" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {payload.entries.map((entry, index) => (
              <motion.button
                key={`${entry.giverName}-${index}`}
                variants={staggerItem}
                type="button"
                onClick={() => handleSelectParticipant(entry)}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '1rem 1.25rem',
                  background: 'rgba(13, 8, 22, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(251,191,36,0.5)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.08)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(13, 8, 22, 0.6)';
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(225,29,72,0.3), rgba(251,191,36,0.3))',
                    fontSize: '0.85rem', fontWeight: 800, color: '#fbbf24', flexShrink: 0,
                  }}>
                    {index + 1}
                  </span>
                  <span>{entry.giverName}</span>
                </span>
                <ChevronRight size={18} color="var(--text-muted)" />
              </motion.button>
            ))}
          </motion.div>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onGoHome} style={{ fontSize: '0.85rem' }}>
              <ArrowLeft size={15} />
              <span>Ir a la página principal</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // FASE: INGRESAR PIN
  // ═══════════════════════════════════════════════════════════════════
  if (phase === PHASES.ENTER_PIN && selectedEntry) {
    const isBlocked = pinAttempts >= MAX_PIN_ATTEMPTS;

    return (
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '1rem' }}>
        <AnimatePresence mode="wait">
          <motion.div key="pin-phase" className="glass-panel" {...pageVariants} transition={{ duration: 0.35 }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div className="brand-badge">
                <Heart size={13} fill="#e11d48" color="#e11d48" />
                <span>Verificación de Identidad</span>
              </div>
              <h2 style={{ fontSize: '1.6rem', marginTop: '0.5rem' }}>
                Hola, <span style={{ color: '#fb7185' }}>{selectedEntry.giverName}</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.3rem' }}>
                Para proteger tu secreto, ingresa tu PIN de 4 dígitos.
              </p>
            </div>

            {/* Icono de seguridad animado */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                style={{
                  display: 'inline-flex', padding: '1.25rem', borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(225,29,72,0.15))',
                  border: '2px solid rgba(251,191,36,0.3)',
                }}
              >
                <ShieldCheck size={48} color="#fbbf24" />
              </motion.div>
            </div>

            {/* Campo de PIN */}
            <div style={{ maxWidth: '300px', margin: '0 auto' }}>
              <label htmlFor="group-pin-input" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem' }}>
                <Key size={15} color="#fbbf24" />
                <span>PIN de 4 dígitos</span>
              </label>

              <div style={{ position: 'relative' }}>
                <input
                  id="group-pin-input"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={4}
                  value={enteredPin}
                  onChange={e => { setEnteredPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(''); }}
                  onKeyDown={handlePinKeyDown}
                  disabled={isBlocked}
                  placeholder="••••"
                  autoFocus
                  style={{
                    width: '100%', padding: '0.85rem 3rem 0.85rem 1rem', fontSize: '1.6rem',
                    letterSpacing: '0.6em', textAlign: 'center',
                    background: 'rgba(13, 8, 22, 0.8)',
                    border: pinError ? '2px solid #f87171' : '2px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)', color: '#fbbf24',
                    outline: 'none', fontFamily: 'monospace', fontWeight: 800,
                    transition: 'border-color 0.2s',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                  tabIndex={-1}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Error animado */}
              <AnimatePresence>
                {pinError && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.6rem', fontSize: '0.82rem', color: '#f87171', background: 'rgba(248,113,113,0.08)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}
                  >
                    <AlertCircle size={14} />
                    <span>{pinError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Botón verificar */}
              <button
                type="button" className="btn btn-primary" onClick={handleVerifyPin}
                disabled={isBlocked || enteredPin.length < 4}
                style={{ width: '100%', marginTop: '1.25rem', padding: '0.85rem', fontSize: '1rem', fontWeight: 700, gap: '0.5rem', opacity: isBlocked || enteredPin.length < 4 ? 0.5 : 1 }}
              >
                <Sparkles size={16} />
                <span>¡Abrir Mi Sobre Digital!</span>
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '1rem', lineHeight: 1.5 }}>
                PIN que ingresaste al registrarte. Si no lo recuerdas, contacta al organizador.
              </p>
            </div>

            {/* Botón volver */}
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={handleBackToNames} style={{ fontSize: '0.85rem' }}>
                <ArrowLeft size={15} />
                <span>Volver a la lista de nombres</span>
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // FASE: AMIGO SECRETO REVELADO
  // ═══════════════════════════════════════════════════════════════════
  if (phase === PHASES.REVEALED && selectedEntry) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1rem' }}>
        <AnimatePresence mode="wait">
          <motion.div key="revealed" className="glass-panel" {...cardVariants} transition={{ type: 'spring', damping: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }} style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                🎁✨
              </motion.div>

              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.85rem', color: '#fbbf24', fontWeight: 800 }}
              >
                ¡Tu Amigo Secreto Es!
              </motion.span>

              <motion.h2
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [0.5, 1.15, 1], opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                style={{
                  fontSize: '2.4rem', color: '#fff', margin: '0.75rem 0 1.25rem',
                  textShadow: '0 2px 15px rgba(251, 113, 133, 0.6)', fontWeight: 900,
                }}
              >
                {selectedEntry.receiverName}
              </motion.h2>

              {/* Gustos del receptor */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(251, 191, 36, 0.35)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem', textAlign: 'left',
                  maxWidth: '460px', margin: '0 auto 1.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                  <Gift size={16} />
                  <span>REGALOS O GUSTOS QUE LE GUSTARÍA RECIBIR:</span>
                </div>
                <p style={{ margin: 0, fontSize: '1.05rem', color: '#fef08a', fontStyle: selectedEntry.receiverWish ? 'normal' : 'italic' }}>
                  {selectedEntry.receiverWish ? `"${selectedEntry.receiverWish}"` : 'No especificó sugerencias particulares. ¡Sorpréndele con un gran detalle!'}
                </p>
              </motion.div>

              {/* Badge de secreto */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: 'rgba(225, 29, 72, 0.25)', padding: '0.5rem 1rem',
                  borderRadius: '999px', marginBottom: '1.75rem', fontSize: '0.85rem', color: '#fff',
                }}
              >
                <ShieldCheck size={16} color="#fb7185" />
                <span>🤫 <strong>¡Es un secreto!</strong> No le cuentes a nadie hasta la fecha de entrega.</span>
              </motion.div>

              {/* Info del evento */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                style={{
                  background: 'rgba(13, 8, 22, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem', marginBottom: '1.5rem',
                  display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                  <DollarSign size={14} color="#4ade80" />
                  <span>Presupuesto: <strong style={{ color: '#4ade80' }}>${new Intl.NumberFormat('es-CO').format(payload.maxBudget)} {payload.currency}</strong></span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                  <Calendar size={14} color="#38bdf8" />
                  <span>Entrega: <strong style={{ color: '#38bdf8' }}>{formatColombiaDateTime(payload.deliveryDateIso)}</strong></span>
                </span>
              </motion.div>

              {payload.notes && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
                  📍 <strong>Lugar / Indicaciones:</strong> {payload.notes}
                </div>
              )}

              {/* Validación */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#86efac', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                <CheckCircle2 size={16} />
                <span>Asignación validada sin familiares</span>
              </div>

              {/* Botón cerrar sobre */}
              <button type="button" className="btn btn-primary" onClick={handleCloseEnvelope} style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
                <Lock size={16} />
                <span>Cerrar mi sobre (Para que pase otra persona)</span>
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return null;
};
