import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, Lock, Key, AlertCircle, Eye, EyeOff, Sparkles, ArrowLeft, RefreshCw, Calendar, DollarSign, Heart, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useGame } from '../../context/GameContext';
import { LocalStorageAdapter } from '../../infrastructure/storage/LocalStorageAdapter';
import { SupabaseStorageService } from '../../infrastructure/storage/SupabaseStorageService';
import { isSupabaseConfigured } from '../../infrastructure/storage/supabaseClient';
import { formatColombiaDateTime } from '../../core/domain/utils/dateFormatters';
import type { Participant } from '../../core/domain/entities/Participant';
import type { DrawPair } from '../../core/domain/entities/DrawPair';
import type { EventConfig } from '../../core/domain/entities/EventConfig';

interface GroupEnvelopeRevealPageProps {
  groupId?: string;
  onGoHome: () => void;
}

export const GroupEnvelopeRevealPage: React.FC<GroupEnvelopeRevealPageProps> = ({ groupId, onGoHome }) => {
  const game = useGame();
  const [activeEventConfig, setActiveEventConfig] = useState<EventConfig>(game.eventConfig);
  const [participantsList, setParticipantsList] = useState<Participant[]>(game.participants);
  const [pairsList, setPairsList] = useState<DrawPair[] | null>(game.pairs);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de revelación
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('');
  const [inputPin, setInputPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [revealedReceiver, setRevealedReceiver] = useState<Participant | null>(null);

  // Cargar datos del grupo según groupId o LocalStorage/Supabase
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      const targetId = groupId || game.eventConfig.id;

      // 1. Si coincide con el juego actual en memoria y ya tiene parejas
      if (game.pairs && game.pairs.length > 0 && (!groupId || game.eventConfig.id === groupId)) {
        setActiveEventConfig(game.eventConfig);
        setParticipantsList(game.participants);
        setPairsList(game.pairs);
        setIsLoading(false);
        return;
      }

      // 2. Intentar cargar desde Supabase
      if (isSupabaseConfigured() && targetId) {
        const cloudGroup = await SupabaseStorageService.loadGroup(targetId);
        if (cloudGroup && cloudGroup.pairs) {
          setActiveEventConfig(cloudGroup.eventConfig);
          setParticipantsList(cloudGroup.participants);
          setPairsList(cloudGroup.pairs);
          setIsLoading(false);
          return;
        }
      }

      // 3. Cargar desde LocalStorage
      if (targetId) {
        const localGroup = LocalStorageAdapter.loadGroup(targetId);
        if (localGroup) {
          setActiveEventConfig(localGroup.eventConfig);
          setParticipantsList(localGroup.participants);
          setPairsList(localGroup.pairs);
          setIsLoading(false);
          return;
        }
      }

      const activeLoaded = LocalStorageAdapter.loadState();
      if (activeLoaded.eventConfig) {
        setActiveEventConfig(activeLoaded.eventConfig);
        setParticipantsList(activeLoaded.participants);
        setPairsList(activeLoaded.pairs);
      }

      setIsLoading(false);
    };

    loadData();
  }, [groupId, game.eventConfig, game.participants, game.pairs]);

  const handleSelectParticipant = (id: string) => {
    setSelectedParticipantId(id);
    setInputPin('');
    setPinError(null);
    setRevealedReceiver(null);
  };

  const handleUnlockEnvelope = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipantId) return;

    const currentParticipant = participantsList.find(p => p.id === selectedParticipantId);
    if (!currentParticipant) return;

    const cleanInput = inputPin.trim().replace(/\D/g, '');
    const realPin = (currentParticipant.pin || '').trim();

    // Si el participante no tenía PIN (caso excepcional), permitir con aviso o 1234
    const isPinCorrect = realPin ? cleanInput === realPin : (cleanInput === '1234' || cleanInput.length === 4);

    if (!isPinCorrect) {
      setPinError('❌ PIN incorrecto. Revisa tus 4 números o pídele al organizador que te recuerde tu PIN.');
      return;
    }

    setPinError(null);

    // Buscar a quién le regala en pairsList
    if (!pairsList || pairsList.length === 0) {
      setPinError('El sorteo aún no se ha realizado para este grupo.');
      return;
    }

    const matchedPair = pairsList.find(pair => pair.giver.id === currentParticipant.id);
    if (matchedPair) {
      setRevealedReceiver(matchedPair.receiver);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#e11d48', '#fb7185', '#fbbf24', '#22c55e', '#38bdf8'],
      });
    } else {
      setPinError('No se encontró asignación de amigo secreto para este participante.');
    }
  };

  const handleCloseEnvelope = () => {
    setRevealedReceiver(null);
    setInputPin('');
    setSelectedParticipantId('');
  };

  if (isLoading) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
        <RefreshCw size={44} className="spin-animation" style={{ color: '#fb7185', margin: '0 auto 1rem', display: 'block' }} />
        <h2 style={{ fontSize: '1.4rem' }}>Cargando sobres del sorteo...</h2>
      </div>
    );
  }

  const hasDrawn = Boolean(pairsList && pairsList.length > 0);

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1rem' }}>
      {/* Botón de volver */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={onGoHome}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} />
          <span>Volver al organizador</span>
        </button>
      </div>

      <motion.div
        className="glass-panel"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Encabezado del Evento */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.25rem' }}>
          <div className="brand-badge" style={{ margin: '0 auto 0.5rem' }}>
            <Heart size={13} fill="#e11d48" color="#e11d48" />
            <span>Sobres Digitales Secretos</span>
            <Sparkles size={13} color="#fbbf24" />
          </div>
          <h1 style={{ fontSize: '1.85rem', margin: '0.25rem 0' }}>{activeEventConfig.title}</h1>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', marginTop: '0.75rem', flexWrap: 'wrap', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <DollarSign size={15} color="#fbbf24" />
              <span>Presupuesto: <strong style={{ color: '#fbbf24' }}>${new Intl.NumberFormat('es-CO').format(activeEventConfig.maxBudget)} COP</strong></span>
            </span>
            {activeEventConfig.deliveryDateIso && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={15} color="#38bdf8" />
                <span>Entrega: <strong style={{ color: '#38bdf8' }}>{formatColombiaDateTime(activeEventConfig.deliveryDateIso)}</strong></span>
              </span>
            )}
          </div>
        </div>

        {!hasDrawn ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <AlertCircle size={48} color="#fbbf24" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.3rem', color: '#fbbf24', marginBottom: '0.5rem' }}>El sorteo aún no se ha realizado</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              El organizador todavía está inscribiendo a los jugadores. Vuelve a consultar una vez que se hayan cerrado las inscripciones y realizado el sorteo.
            </p>
          </div>
        ) : revealedReceiver ? (
          /* ========================================================================= */
          /* PANTALLA DE REVELACIÓN EXITOSA DEL AMIGO SECRETO CON CONFETI */
          /* ========================================================================= */
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20 }}
            style={{
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.2) 0%, rgba(251, 191, 36, 0.15) 100%)',
              border: '2px solid #fb7185',
              borderRadius: 'var(--radius-lg)',
              padding: '2.5rem 1.5rem',
              boxShadow: '0 15px 40px rgba(225, 29, 72, 0.25)',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎁✨</div>

            <span style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.85rem', color: '#fbbf24', fontWeight: 800 }}>
              ¡Tu Amigo Secreto Es!
            </span>

            <h2
              style={{
                fontSize: '2.2rem',
                color: '#fff',
                margin: '0.5rem 0 1.25rem',
                textShadow: '0 2px 15px rgba(251, 113, 133, 0.6)',
                fontWeight: 900,
              }}
            >
              {revealedReceiver.name}
            </h2>

            {/* Lista de deseos / Qué le gusta */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(251, 191, 36, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                textAlign: 'left',
                maxWidth: '460px',
                margin: '0 auto 1.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                <Gift size={16} />
                <span>REGALOS O GUSTOS QUE LE GUSTARÍA RECIBIR:</span>
              </div>
              <p style={{ margin: 0, fontSize: '1.05rem', color: '#fef08a', fontStyle: revealedReceiver.giftWish ? 'normal' : 'italic' }}>
                {revealedReceiver.giftWish ? `"${revealedReceiver.giftWish}"` : 'No especificó sugerencias particulares. ¡Sorpréndele con un gran detalle!'}
              </p>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(225, 29, 72, 0.25)',
                padding: '0.5rem 1rem',
                borderRadius: '999px',
                marginBottom: '1.75rem',
                fontSize: '0.85rem',
                color: '#fff',
              }}
            >
              <ShieldCheck size={16} color="#fb7185" />
              <span>🤫 <strong>¡Es un secreto!</strong> No le cuentes a nadie hasta la fecha de entrega.</span>
            </div>

            <div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCloseEnvelope}
                style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
              >
                <Lock size={16} />
                <span>Cerrar mi sobre (Para que pase otra persona)</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* ========================================================================= */
          /* FORMULARIO DE SELECCIÓN DE JUGADOR Y DESBLOQUEO CON PIN */
          /* ========================================================================= */
          <div>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.98rem', marginBottom: '1.5rem' }}>
              Selecciona tu nombre y digita tu <strong>PIN personal de 4 dígitos</strong> para abrir tu sobre de forma privada.
            </p>

            {/* Selector de participante */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="select-participant" style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                <span>1. ¿Quién eres tú? (Selecciona tu nombre) *</span>
              </label>
              <select
                id="select-participant"
                className="form-input"
                style={{ fontSize: '1.05rem', padding: '0.75rem 1rem' }}
                value={selectedParticipantId}
                onChange={e => handleSelectParticipant(e.target.value)}
              >
                <option value="">-- Elige tu nombre de la lista --</option>
                {participantsList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedParticipantId && (
              <form onSubmit={handleUnlockEnvelope}>
                {/* Campo para ingresar el PIN */}
                <div
                  style={{
                    background: 'rgba(251, 191, 36, 0.08)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.5rem',
                    textAlign: 'center',
                    marginBottom: '1.5rem',
                  }}
                >
                  <label
                    htmlFor="unlock-pin"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      color: '#fbbf24',
                      fontSize: '1rem',
                      fontWeight: 700,
                      marginBottom: '0.4rem',
                    }}
                  >
                    <Key size={18} />
                    <span>2. Ingresa tu PIN de 4 números *</span>
                  </label>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
                    Digita el PIN que creaste al momento de inscribirte.
                  </p>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      id="unlock-pin"
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      className="form-input"
                      style={{
                        width: '180px',
                        fontSize: '2rem',
                        letterSpacing: '0.35em',
                        textAlign: 'center',
                        fontWeight: 800,
                        color: '#fbbf24',
                        borderColor: pinError ? '#f87171' : 'rgba(251, 191, 36, 0.5)',
                        padding: '0.4rem 0.5rem',
                      }}
                      value={inputPin}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').substring(0, 4);
                        setInputPin(val);
                        setPinError(null);
                      }}
                      placeholder="••••"
                      autoFocus
                      required
                    />

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.8rem' }}
                      onClick={() => setShowPin(!showPin)}
                      title={showPin ? 'Ocultar PIN' : 'Ver PIN'}
                    >
                      {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {pinError && (
                    <div style={{ color: '#f87171', fontSize: '0.88rem', marginTop: '0.75rem', fontWeight: 600 }}>
                      {pinError}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '1rem', fontSize: '1.15rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  disabled={inputPin.length !== 4}
                >
                  <Sparkles size={20} />
                  <span>¡Abrir Mi Sobre Digital!</span>
                </button>
              </form>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
