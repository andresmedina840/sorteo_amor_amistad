import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Send, Users, UserPlus, Trash2, ArrowLeft, ArrowRight, Gift, Phone, Check, Sparkles, RefreshCw, Radio, Key, Eye, EyeOff, Dices } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { RegistrationSyncService, type PlayerRegistrationData } from '../../infrastructure/services/RegistrationSyncService';
import { showToast, showConfirmDialog } from '../../core/domain/utils/alertUtils';
import { validateColombiaPhone, formatColombiaPhone } from '../../core/domain/utils/phoneUtils';
import type { Participant } from '../../core/domain/entities/Participant';

export const Step2PlayerRegistration: React.FC = () => {
  const { eventConfig, participants, addParticipant, removeParticipant, setStep } = useGame();
  const [copiedLink, setCopiedLink] = useState(false);
  const [cloudRoomId, setCloudRoomId] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Formulario manual opcional con nombre único en mayúsculas
  const [manualName, setManualName] = useState('');
  const [manualPin, setManualPin] = useState('1234');
  const [manualPhone, setManualPhone] = useState('');
  const [manualWish, setManualWish] = useState('');
  const [showPinsMap, setShowPinsMap] = useState<Record<string, boolean>>({});

  const syncService = useMemo(() => new RegistrationSyncService(), []);
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const participantsRef = useRef<Participant[]>(participants);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  // Inicializar sala y generar enlace de registro
  useEffect(() => {
    const initRoom = async () => {
      const baseUrl = typeof window !== 'undefined' ? window.location.href : '';
      const roomId = await syncService.createOrGetRoom(eventConfig);
      setCloudRoomId(roomId);
      const url = await syncService.generateInviteLink(eventConfig, baseUrl);
      setInviteUrl(url);
    };

    initRoom();
  }, [eventConfig, syncService]);

  // Función de sincronización con la nube
  const syncWithCloud = async () => {
    if (!cloudRoomId) return;
    setIsSyncing(true);
    try {
      const cloudPlayers = await syncService.getCloudPlayers(cloudRoomId);
      if (cloudPlayers && cloudPlayers.length > 0) {
        const currentList = participantsRef.current;
        for (const player of cloudPlayers) {
          const alreadyExists = currentList.some(
            p => p.name.trim().toLowerCase() === player.name.trim().toLowerCase()
          );
          if (!alreadyExists) {
            addParticipant({
              name: player.name.trim().toUpperCase(),
              phone: player.phone?.trim() || undefined,
              pin: player.pin?.trim() || undefined,
              giftWish: player.giftWish?.trim() || undefined,
            });
            showToast(`🎉 ¡${player.name} se registró automáticamente!`, 'success');
          }
        }
      }
    } catch (err) {
      console.warn('Error sincronizando con la nube:', err);
    } finally {
      setTimeout(() => setIsSyncing(false), 400);
    }
  };

  // Sincronización periódica automática (polling cada 3.5s) y listener en vivo SSE
  useEffect(() => {
    if (!cloudRoomId) return;

    // 1. Sincronizar de inmediato
    syncWithCloud();

    // 2. Polling periódico de seguridad
    const intervalId = setInterval(() => {
      syncWithCloud();
    }, 3500);

    // 3. Listener en tiempo real SSE (Server-Sent Events) via ntfy
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`https://ntfy.sh/sorteo_amoryamistad_${cloudRoomId}/sse`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.message) {
            const player = JSON.parse(data.message) as PlayerRegistrationData;
            if (player && player.name) {
              const currentList = participantsRef.current;
              const alreadyExists = currentList.some(
                p => p.name.trim().toLowerCase() === player.name.trim().toLowerCase()
              );
              if (!alreadyExists) {
                addParticipant({
                  name: player.name.trim().toUpperCase(),
                  phone: player.phone?.trim() || undefined,
                  pin: player.pin?.trim() || undefined,
                  giftWish: player.giftWish?.trim() || undefined,
                });
                showToast(`🎉 ¡${player.name} acaba de registrarse!`, 'success');
              }
            }
          }
        } catch {
          syncWithCloud();
        }
      };
    } catch (err) {
      console.warn('SSE no disponible, usando polling continuo.', err);
    }

    return () => {
      clearInterval(intervalId);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [cloudRoomId]);

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      showToast('¡Enlace de registro copiado al portapapeles!', 'success');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast('No se pudo copiar el enlace', 'warning');
    }
  };

  const whatsappInviteMessage = 
`💌 *¡Te invito a jugar Amor y Amistad: ${eventConfig.title}!* 🎁✨

💰 *Presupuesto:* ${eventConfig.getFormattedBudget()}
🗓️ *Entrega:* ${eventConfig.getFormattedDeliveryDate()}

👉 *Toca aquí para registrarte:*
${inviteUrl}`;

  const whatsappInviteUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappInviteMessage)}`;


  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    const fullUpperName = manualName.trim().toUpperCase();

    if (!fullUpperName) {
      showToast('Por favor escribe el nombre del participante', 'warning');
      return;
    }

    // Validación de PIN manual
    const cleanPin = manualPin.trim().replace(/\D/g, '');
    if (cleanPin.length !== 4) {
      showToast('El PIN debe tener exactamente 4 números', 'warning');
      return;
    }

    let cleanPhone: string | undefined = undefined;
    if (manualPhone.trim()) {
      const validation = validateColombiaPhone(manualPhone);
      if (!validation.isValid) {
        showToast(validation.errorMessage || 'El celular debe tener 10 dígitos', 'warning');
        return;
      }
      cleanPhone = validation.cleanPhone;
    }

    addParticipant({
      name: fullUpperName,
      phone: cleanPhone,
      pin: cleanPin,
      giftWish: manualWish.trim() || undefined,
    });

    setManualName('');
    setManualPin(Math.floor(1000 + Math.random() * 9000).toString());
    setManualPhone('');
    setManualWish('');
    showToast(`¡${fullUpperName} agregado con PIN ${cleanPin}!`, 'success');
  };

  const handleRemove = async (participant: Participant) => {
    const confirmed = await showConfirmDialog(
      `¿Eliminar a ${participant.name}?`,
      'Se removerá de la lista de jugadores.',
      'Sí, eliminar',
      'Cancelar'
    );
    if (confirmed) {
      removeParticipant(participant.id);
      showToast(`${participant.name} eliminado`, 'info');
    }
  };

  return (
    <motion.div
      className="glass-panel"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ marginBottom: '1.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Share2 color="#fb7185" />
          <span>Enlace de Registro y Convocatoria de Jugadores</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Envía el enlace a tus amigos o familiares. <strong>Al registrarse en su celular, aparecerán automáticamente en esta lista en tiempo real</strong> sin necesidad de enviar mensajes ni de tocar nada más.
        </p>
      </div>

      {/* Tarjeta destacada de Invitación para Jugadores */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)',
          border: '2px solid rgba(225, 29, 72, 0.35)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={20} color="#fbbf24" />
            <h3 style={{ fontSize: '1.25rem', color: '#fff', margin: 0 }}>
              Comparte este enlace para que los jugadores se registren:
            </h3>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#4ade80',
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            <Radio size={12} className="pulse-slow" />
            <span>Sincronización en vivo 100% automática</span>
          </div>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Al abrir este enlace, cada participante ingresará su nombre y su lista de deseos de regalo. El registro se guarda al instante.
        </p>

        {/* Barra de enlace y botones */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            readOnly
            value={inviteUrl}
            className="form-input"
            style={{
              flex: '1 1 280px',
              background: 'rgba(0, 0, 0, 0.4)',
              color: '#fbbf24',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
            }}
            onClick={handleCopyInvite}
          />

          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.25rem' }}
            onClick={handleCopyInvite}
          >
            {copiedLink ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
            <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
          </button>

          <a
            href={whatsappInviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp"
            style={{ padding: '0.75rem 1.4rem' }}
          >
            <Send size={16} />
            <span>Invitar por WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Lista de Jugadores Registrados con barra de estado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <Users size={20} color="#fb7185" />
          <span>Jugadores Registrados en Tiempo Real:</span>
          <span
            style={{
              background: 'rgba(225, 29, 72, 0.2)',
              border: '1px solid var(--primary)',
              padding: '0.2rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 700,
            }}
          >
            {participants.length}
          </span>
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            onClick={syncWithCloud}
            title="Verificar nuevos registros en la nube"
          >
            <RefreshCw size={13} className={isSyncing ? 'spin-animation' : ''} />
            <span>{isSyncing ? 'Actualizando...' : 'Actualizar ahora'}</span>
          </button>

          {participants.length < 3 && (
            <span style={{ fontSize: '0.82rem', color: '#fca5a5' }}>
              * Mínimo 3 jugadores para realizar el sorteo
            </span>
          )}
        </div>
      </div>

      {participants.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)', marginBottom: '2rem' }}>
          <Users size={44} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Esperando que los jugadores abran el enlace y se registren...</p>
          <p style={{ color: '#4ade80', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            ⚡ Los registros aparecerán aquí automáticamente en cuanto los envíen.
          </p>
        </div>
      ) : (
        <div className="participants-list" style={{ marginBottom: '2rem' }}>
          <AnimatePresence>
            {participants.map((p, index) => (
              <motion.div
                key={p.id}
                className="participant-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '1.1rem', color: '#fff' }}>
                      {index + 1}. {p.name}
                    </strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                      {/* PIN Secreto */}
                      <div
                        style={{
                          fontSize: '0.78rem',
                          background: 'rgba(251, 191, 36, 0.15)',
                          border: '1px solid rgba(251, 191, 36, 0.4)',
                          color: '#fbbf24',
                          padding: '0.15rem 0.55rem',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                        }}
                      >
                        <Key size={12} />
                        <span>PIN: {showPinsMap[p.id] ? (p.pin || 'Sin PIN') : '••••'}</span>
                        <button
                          type="button"
                          onClick={() => setShowPinsMap(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                          style={{ background: 'transparent', border: 'none', color: '#fbbf24', cursor: 'pointer', padding: 0, display: 'flex' }}
                          title={showPinsMap[p.id] ? 'Ocultar PIN' : 'Ver PIN'}
                        >
                          {showPinsMap[p.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </div>

                      {p.phone && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Phone size={11} color="#4ade80" />
                          <span style={{ color: '#4ade80', fontWeight: 600 }}>🇨🇴 +57 {formatColombiaPhone(p.phone)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger-outline"
                    onClick={() => handleRemove(p)}
                    title={`Eliminar a ${p.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Qué regalos quiere */}
                <div style={{ marginTop: '0.75rem', background: 'rgba(255, 255, 255, 0.04)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                    <Gift size={13} />
                    <span>REGALOS QUE QUIERE:</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#fde68a' }}>
                    {p.giftWish ? `"${p.giftWish}"` : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No especificó gustos</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Formulario para registrar manualmente si alguien no usa el enlace */}
      <details style={{ background: 'rgba(13, 8, 22, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '2rem' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          ➕ ¿Deseas agregar a alguien manualmente que no tenga celular? (Clic aquí)
        </summary>
        <form onSubmit={handleAddManual} style={{ marginTop: '1rem' }}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">NOMBRE DEL PARTICIPANTE *</label>
            <input
              type="text"
              className="form-input"
              style={{ textTransform: 'uppercase' }}
              value={manualName}
              onChange={e => setManualName(e.target.value.toUpperCase())}
              placeholder="EJ: CARLOS GÓMEZ"
              required
            />
          </div>
          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ color: '#fbbf24', fontWeight: 700 }}>
                <Key size={13} />
                <span>PIN Secreto (4 Números) *</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  className="form-input"
                  style={{ textAlign: 'center', fontWeight: 700, letterSpacing: '0.2em', color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.4)' }}
                  value={manualPin}
                  onChange={e => setManualPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                  required
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.65rem 0.75rem', fontSize: '0.78rem' }}
                  onClick={() => setManualPin(Math.floor(1000 + Math.random() * 9000).toString())}
                  title="Generar PIN aleatorio"
                >
                  <Dices size={14} />
                  <span>Azar</span>
                </button>
              </div>
              <span className="form-helper">Con este PIN verá quién le salió</span>
            </div>

            <div className="form-group">
              <label className="form-label">WhatsApp / Celular (Opcional)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.06)', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem', fontWeight: 600 }}>
                  🇨🇴 +57
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  className="form-input"
                  value={manualPhone}
                  onChange={e => setManualPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="3001234567 (Opcional)"
                />
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">¿Qué regalos quiere? (Opcional)</label>
              <input
                type="text"
                className="form-input"
                value={manualWish}
                onChange={e => setManualWish(e.target.value)}
                placeholder="Ej: Bufanda tejida, chocolates, flores"
              />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-secondary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>
              <UserPlus size={15} />
              <span>Agregar a la lista</span>
            </button>
          </div>
        </form>
      </details>

      {/* Navegación al Paso 3: Ya cuando estén todos registrados, ahí sí asignar familiares */}
      <div className="step-nav-buttons" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
          <ArrowLeft size={18} />
          <span>Volver a Configuración</span>
        </button>

        <button
          type="button"
          className="btn btn-primary"
          style={{ fontSize: '1.05rem', padding: '0.9rem 1.8rem' }}
          onClick={() => setStep(3)}
          disabled={participants.length < 3}
        >
          <span>Ya están todos registrados → Continuar a Asignar Familiares</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </motion.div>
  );
};
