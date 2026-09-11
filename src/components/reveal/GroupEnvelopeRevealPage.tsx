import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Gift, Lock, Key, AlertCircle, Eye, EyeOff, Sparkles, ArrowLeft, RefreshCw, Calendar, DollarSign, Heart, ShieldCheck, UserCheck, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useGame } from '../../context/GameContext';

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
        if (cloudGroup) {
          setActiveEventConfig(cloudGroup.eventConfig);
          setParticipantsList(cloudGroup.participants);
          setPairsList(cloudGroup.pairs);
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(false);
    };

    loadData();
  }, [groupId, game.eventConfig, game.participants, game.pairs]);

  // Lista deduplicada y ordenada alfabéticamente para evitar nombres repetidos y asegurar enlace con el sorteo
  const selectableParticipants = useMemo(() => {
    const map = new Map<string, Participant>();

    // 1. Si ya se realizó el sorteo, priorizar a los participantes (givers) del sorteo oficial
    if (pairsList && pairsList.length > 0) {
      for (const pair of pairsList) {
        const key = pair.giver.name.trim().toUpperCase();
        map.set(key, pair.giver);
      }
    }

    // 2. Agregar cualquier participante de la lista que no esté presente
    for (const p of participantsList) {
      const key = p.name.trim().toUpperCase();
      if (!map.has(key)) {
        map.set(key, p);
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [participantsList, pairsList]);

  const handleSelectParticipant = (id: string) => {
    setSelectedParticipantId(id);
    setInputPin('');
    setPinError(null);
    setRevealedReceiver(null);
  };

  const executeUnlock = (pinToUnlock: string, participantId: string) => {
    if (!participantId) return;

    // Buscar en selectableParticipants y luego en participantsList
    const currentParticipant =
      selectableParticipants.find(p => p.id === participantId) ||
      participantsList.find(p => p.id === participantId);

    if (!currentParticipant) return;

    const cleanInput = pinToUnlock.trim().replace(/\D/g, '');

    // Verificar si el sorteo está disponible
    if (!pairsList || pairsList.length === 0) {
      setPinError('El sorteo aún no se ha realizado para este grupo.');
      return;
    }

    // Buscar a quién le regala en pairsList con doble verificación (por ID o por Nombre)
    const normalizedName = currentParticipant.name.trim().toUpperCase();
    const matchedPair = pairsList.find(
      pair =>
        pair.giver.id === currentParticipant.id ||
        pair.giver.name.trim().toUpperCase() === normalizedName
    );

    if (!matchedPair) {
      setPinError('No se encontró asignación de amigo secreto para este participante.');
      return;
    }

    // Validar PIN contra el participante actual o el participante registrado en el sorteo
    const realPin = (currentParticipant.pin || matchedPair.giver.pin || '').trim();
    const isPinCorrect = realPin ? cleanInput === realPin : (cleanInput === '1234' || cleanInput.length === 4);

    if (!isPinCorrect) {
      setPinError('❌ PIN incorrecto. Revisa tus 4 números o pídele al organizador que te recuerde tu PIN.');
      return;
    }

    setPinError(null);
    setRevealedReceiver(matchedPair.receiver);
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#e11d48', '#fb7185', '#fbbf24', '#22c55e', '#38bdf8'],
    });
  };

  const handleUnlockEnvelope = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeUnlock(inputPin, selectedParticipantId);
  };

  const handleCloseEnvelope = () => {
    setRevealedReceiver(null);
    setInputPin('');
    setSelectedParticipantId('');
    setPinError(null);
  };

  const selectedParticipant = useMemo(() => {
    return (
      selectableParticipants.find(p => p.id === selectedParticipantId) ||
      participantsList.find(p => p.id === selectedParticipantId)
    );
  }, [selectableParticipants, participantsList, selectedParticipantId]);

  if (isLoading) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 2rem', maxWidth: '540px', margin: '2rem auto' }}>
        <RefreshCw size={44} className="spin-animation" style={{ color: '#fb7185', margin: '0 auto 1rem', display: 'block' }} />
        <h2 style={{ fontSize: '1.35rem', color: '#fff' }}>Cargando sobres del sorteo...</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
          Conectando de forma segura con la base de datos.
        </p>
      </div>
    );
  }

  const hasDrawn = Boolean(pairsList && pairsList.length > 0);

  return (
    <div style={{ maxWidth: '620px', margin: '0 auto', padding: '1rem' }}>
      {/* Barra superior de navegación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={onGoHome}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
        >
          <ArrowLeft size={16} />
          <span>Volver al inicio</span>
        </button>

        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <ShieldCheck size={14} color="#4ade80" />
          <span>100% Confidencial</span>
        </span>
      </div>

      <motion.div
        className="glass-panel"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ overflow: 'hidden', padding: '1.75rem 1.25rem' }}
      >
        {/* Encabezado del Evento */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.25rem' }}>
          <div className="brand-badge" style={{ margin: '0 auto 0.5rem' }}>
            <Heart size={13} fill="#e11d48" color="#e11d48" />
            <span>Sobres Digitales Secretos</span>
            <Sparkles size={13} color="#fbbf24" />
          </div>
          <h1 style={{ fontSize: '1.75rem', margin: '0.25rem 0', color: '#fff', fontWeight: 800 }}>
            {activeEventConfig.title}
          </h1>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', marginTop: '0.75rem', flexWrap: 'wrap', fontSize: '0.88rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#fef08a' }}>
              <DollarSign size={15} color="#fbbf24" />
              <span>Regalo: <strong>${new Intl.NumberFormat('es-CO').format(activeEventConfig.maxBudget)} COP</strong></span>
            </span>
            {activeEventConfig.deliveryDateIso && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#bae6fd' }}>
                <Calendar size={15} color="#38bdf8" />
                <span>Entrega: <strong>{formatColombiaDateTime(activeEventConfig.deliveryDateIso)}</strong></span>
              </span>
            )}
          </div>
        </div>

        {!hasDrawn ? (
          /* ========================================================================= */
          /* PANTALLA: AÚN NO SE HA SORTEADO */
          /* ========================================================================= */
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <AlertCircle size={48} color="#fbbf24" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.3rem', color: '#fbbf24', marginBottom: '0.5rem' }}>El sorteo aún no se ha realizado</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              El organizador todavía está inscribiendo a los participantes. Podrás abrir tu sobre aquí una vez se haga el sorteo oficial.
            </p>
          </div>
        ) : revealedReceiver ? (
          /* ========================================================================= */
          /* PANTALLA DE REVELACIÓN EXITOSA DEL AMIGO SECRETO CON CONFETI */
          /* ========================================================================= */
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20 }}
            style={{
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.22) 0%, rgba(251, 191, 36, 0.16) 100%)',
              border: '2px solid #fb7185',
              borderRadius: 'var(--radius-lg)',
              padding: '2.25rem 1.25rem',
              boxShadow: '0 15px 40px rgba(225, 29, 72, 0.3)',
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.25, 1] }}
              transition={{ duration: 0.5 }}
              style={{ fontSize: '3.2rem', marginBottom: '0.25rem' }}
            >
              🎁✨
            </motion.div>

            <span style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.85rem', color: '#fbbf24', fontWeight: 800 }}>
              ¡Tu Amigo Secreto Asignado Es!
            </span>

            <h2
              style={{
                fontSize: '2.4rem',
                color: '#fff',
                margin: '0.4rem 0 1.25rem',
                textShadow: '0 0 25px rgba(251, 113, 133, 0.75)',
                fontWeight: 900,
                letterSpacing: '0.02em',
              }}
            >
              {revealedReceiver.name}
            </h2>

            {/* Lista de deseos / Qué le gusta */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                textAlign: 'left',
                maxWidth: '460px',
                margin: '0 auto 1.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                <Gift size={16} />
                <span>SUGERENCIAS DE REGALOS O GUSTOS:</span>
              </div>
              <p style={{ margin: 0, fontSize: '1.05rem', color: '#fef08a', fontStyle: revealedReceiver.giftWish ? 'normal' : 'italic', lineHeight: 1.5 }}>
                {revealedReceiver.giftWish ? `"${revealedReceiver.giftWish}"` : 'No especificó sugerencias particulares. ¡Sorpréndele con un gran detalle!'}
              </p>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(225, 29, 72, 0.3)',
                border: '1px solid rgba(251, 113, 133, 0.4)',
                padding: '0.5rem 1.1rem',
                borderRadius: '999px',
                marginBottom: '1.75rem',
                fontSize: '0.85rem',
                color: '#fff',
              }}
            >
              <ShieldCheck size={16} color="#fb7185" />
              <span>🤫 <strong>¡Es un secreto!</strong> No le cuentes a nadie hasta el día de la entrega.</span>
            </div>

            <div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCloseEnvelope}
                style={{ padding: '0.85rem 2rem', fontSize: '1.05rem', width: '100%', maxWidth: '420px', margin: '0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Lock size={18} />
                <span>Cerrar mi sobre (Para que otra persona consulte)</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* ========================================================================= */
          /* FORMULARIO ULTRA INTUITIVO: SELECCIÓN DE NOMBRE + PIN OTP AUTOMÁTICO */
          /* ========================================================================= */
          <div>
            {!selectedParticipantId ? (
              /* PASO 1: Elegir el nombre */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.2) 0%, rgba(251, 191, 36, 0.2) 100%)',
                      border: '2px solid rgba(251, 191, 36, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.75rem',
                    }}
                  >
                    <UserCheck size={28} color="#fbbf24" />
                  </div>
                  <h2 style={{ fontSize: '1.35rem', color: '#fff', margin: '0 0 0.4rem' }}>
                    1. ¿Quién eres tú?
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
                    Busca tu nombre en la lista para acceder a tu sobre privado.
                  </p>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
                  <select
                    id="select-participant"
                    className="form-input"
                    style={{
                      fontSize: '1.15rem',
                      padding: '0.9rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '2px solid rgba(251, 191, 36, 0.4)',
                      background: 'rgba(15, 10, 25, 0.95)',
                      color: '#fbbf24',
                      fontWeight: 700,
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                    value={selectedParticipantId}
                    onChange={e => handleSelectParticipant(e.target.value)}
                  >
                    <option value="" style={{ color: '#fff', background: '#1c1326' }}>
                      👇 Haz clic aquí y elige tu nombre...
                    </option>
                    {selectableParticipants.map(p => (
                      <option key={p.id} value={p.id} style={{ color: '#fff', background: '#1c1326' }}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            ) : (
              /* PASO 2: Ingresar PIN con 4 casillas interactivas y auto-apertura */
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
              >
                {/* Tarjeta de bienvenida personalizada */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(251, 191, 36, 0.08)',
                    border: '1px solid rgba(251, 191, 36, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1.15rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #e11d48 0%, #fb7185 100%)',
                        color: '#fff',
                        fontWeight: 900,
                        fontSize: '1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(225, 29, 72, 0.4)',
                      }}
                    >
                      {selectedParticipant?.name?.charAt(0) || '👤'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Participante
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                        {selectedParticipant?.name}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedParticipantId('');
                      setInputPin('');
                      setPinError(null);
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', gap: '0.3rem' }}
                    title="Elegir otro nombre"
                  >
                    <RotateCcw size={13} />
                    <span>Cambiar</span>
                  </button>
                </div>

                <form onSubmit={handleUnlockEnvelope}>
                  {/* Tarjeta de ingreso de PIN */}
                  <motion.div
                    animate={pinError ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    style={{
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: pinError ? '1px solid #f87171' : '1px solid rgba(251, 191, 36, 0.3)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '1.75rem 1rem',
                      textAlign: 'center',
                      marginBottom: '1.5rem',
                      position: 'relative',
                    }}
                  >
                    <label
                      htmlFor="unlock-pin-hidden"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        color: '#fbbf24',
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        marginBottom: '0.3rem',
                      }}
                    >
                      <Key size={18} />
                      <span>Digita tu PIN de 4 números</span>
                    </label>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem' }}>
                      El PIN que creaste al momento de registrarte.
                    </p>

                    {/* Casillas visuales tipo OTP (4 cuadritos elegantes) */}
                    <div
                      onClick={() => {
                        const inputEl = document.getElementById('unlock-pin-hidden');
                        if (inputEl) inputEl.focus();
                      }}
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        marginBottom: '1rem',
                        cursor: 'text',
                      }}
                    >
                      {[0, 1, 2, 3].map(index => {
                        const digit = inputPin[index];
                        const isCurrent = inputPin.length === index;
                        const isFilled = Boolean(digit);

                        return (
                          <motion.div
                            key={index}
                            animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 1.2 }}
                            style={{
                              width: '54px',
                              height: '64px',
                              borderRadius: '12px',
                              background: isFilled ? 'rgba(251, 191, 36, 0.15)' : 'rgba(15, 10, 25, 0.8)',
                              border: pinError
                                ? '2px solid #f87171'
                                : isFilled
                                ? '2px solid #fbbf24'
                                : isCurrent
                                ? '2px solid #fb7185'
                                : '2px solid rgba(255, 255, 255, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '2rem',
                              fontWeight: 900,
                              color: '#fbbf24',
                              boxShadow: isFilled
                                ? '0 0 15px rgba(251, 191, 36, 0.25)'
                                : isCurrent
                                ? '0 0 12px rgba(251, 113, 133, 0.3)'
                                : 'none',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {isFilled ? (showPin ? digit : '●') : ''}
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Input real accesible y oculto */}
                    <input
                      id="unlock-pin-hidden"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={inputPin}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').substring(0, 4);
                        setInputPin(val);
                        setPinError(null);
                        if (val.length === 4) {
                          // Auto-apertura instantánea apenas digitan el 4to número
                          setTimeout(() => {
                            executeUnlock(val, selectedParticipantId);
                          }, 100);
                        }
                      }}
                      autoFocus
                      required
                      style={{
                        position: 'absolute',
                        opacity: 0,
                        pointerEvents: 'none',
                        width: '1px',
                        height: '1px',
                      }}
                    />

                    {/* Botón para ver/ocultar números */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                        <span>{showPin ? 'Ocultar dígitos' : 'Ver números'}</span>
                      </button>

                      {inputPin.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setInputPin('');
                            setPinError(null);
                            const el = document.getElementById('unlock-pin-hidden');
                            if (el) el.focus();
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <RotateCcw size={13} />
                          <span>Borrar</span>
                        </button>
                      )}
                    </div>

                    {/* Indicador de apertura automática */}
                    <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                      <Sparkles size={14} color="#fbbf24" />
                      <span>¡Tu sobre se abrirá automáticamente al escribir los 4 números!</span>
                    </div>

                    {pinError && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          color: '#fca5a5',
                          fontSize: '0.88rem',
                          marginTop: '0.85rem',
                          fontWeight: 600,
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.6rem 0.8rem',
                        }}
                      >
                        {pinError}
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Botón manual de respaldo */}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '0.95rem',
                      fontSize: '1.1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      opacity: inputPin.length === 4 ? 1 : 0.6,
                    }}
                    disabled={inputPin.length !== 4}
                  >
                    <Sparkles size={18} />
                    <span>¡Abrir Mi Sobre Digital!</span>
                  </button>
                </form>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

