import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Send, Users, UserPlus, Trash2, ArrowLeft, ArrowRight, Gift, Phone, Check, Sparkles, RefreshCw, Radio } from 'lucide-react';
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

  // Formulario manual opcional con nombres y apellidos separados en mayúsculas
  const [manualFirstName, setManualFirstName] = useState('');
  const [manualSecondName, setManualSecondName] = useState('');
  const [manualFirstLastName, setManualFirstLastName] = useState('');
  const [manualSecondLastName, setManualSecondLastName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualWish, setManualWish] = useState('');

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

💰 *Presupuesto máximo:* ${eventConfig.getFormattedBudget()}
🗓️ *Fecha de entrega:* ${eventConfig.getFormattedDeliveryDate()}

👉 *Entra a este enlace para registrarte y colocar qué regalos te gustaría recibir:*
${inviteUrl}

¡Tu registro es 100% automático! No te quedes por fuera 🥳`;

  const whatsappInviteUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappInviteMessage)}`;

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFirst = manualFirstName.trim().toUpperCase();
    const cleanSecond = manualSecondName.trim().toUpperCase();
    const cleanLast1 = manualFirstLastName.trim().toUpperCase();
    const cleanLast2 = manualSecondLastName.trim().toUpperCase();

    if (!cleanFirst) {
      showToast('Por favor escribe el PRIMER NOMBRE', 'warning');
      return;
    }
    if (!cleanLast1) {
      showToast('Por favor escribe el PRIMER APELLIDO', 'warning');
      return;
    }

    const fullUpperName = [cleanFirst, cleanSecond, cleanLast1, cleanLast2]
      .filter(Boolean)
      .join(' ');

    let cleanPhone: string | undefined = undefined;
    if (manualPhone.trim()) {
      const validation = validateColombiaPhone(manualPhone);
      if (!validation.isValid) {
        showToast(validation.errorMessage || 'El celular debe tener 10 dígitos y comenzar por 3', 'warning');
        return;
      }
      cleanPhone = validation.cleanPhone;
    }

    addParticipant({
      name: fullUpperName,
      phone: cleanPhone,
      giftWish: manualWish.trim() || undefined,
    });

    setManualFirstName('');
    setManualSecondName('');
    setManualFirstLastName('');
    setManualSecondLastName('');
    setManualPhone('');
    setManualWish('');
    showToast(`¡${fullUpperName} agregado a la lista!`, 'success');
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
                    {p.phone && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                        <Phone size={11} color="#4ade80" />
                        <span style={{ color: '#4ade80', fontWeight: 600 }}>🇨🇴 +57 {formatColombiaPhone(p.phone)}</span>
                      </div>
                    )}
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
          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">PRIMER NOMBRE *</label>
              <input
                type="text"
                className="form-input"
                style={{ textTransform: 'uppercase' }}
                value={manualFirstName}
                onChange={e => setManualFirstName(e.target.value.toUpperCase())}
                placeholder="EJ: CARLOS"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">SEGUNDO NOMBRE (OPCIONAL)</label>
              <input
                type="text"
                className="form-input"
                style={{ textTransform: 'uppercase' }}
                value={manualSecondName}
                onChange={e => setManualSecondName(e.target.value.toUpperCase())}
                placeholder="EJ: ALBERTO"
              />
            </div>
            <div className="form-group">
              <label className="form-label">PRIMER APELLIDO *</label>
              <input
                type="text"
                className="form-input"
                style={{ textTransform: 'uppercase' }}
                value={manualFirstLastName}
                onChange={e => setManualFirstLastName(e.target.value.toUpperCase())}
                placeholder="EJ: GÓMEZ"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">SEGUNDO APELLIDO (OPCIONAL)</label>
              <input
                type="text"
                className="form-input"
                style={{ textTransform: 'uppercase' }}
                value={manualSecondLastName}
                onChange={e => setManualSecondLastName(e.target.value.toUpperCase())}
                placeholder="EJ: PÉREZ"
              />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">WhatsApp / Celular (10 dígitos empezando en 3)</label>
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
                  placeholder="3001234567"
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
