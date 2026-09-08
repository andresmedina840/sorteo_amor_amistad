import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Send, Users, UserPlus, Trash2, ArrowLeft, ArrowRight, Gift, Phone, Check, Sparkles } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { RegistrationSyncService } from '../../infrastructure/services/RegistrationSyncService';
import { showToast, showConfirmDialog } from '../../core/domain/utils/alertUtils';
import type { Participant } from '../../core/domain/entities/Participant';

export const Step2PlayerRegistration: React.FC = () => {
  const { eventConfig, participants, addParticipant, removeParticipant, setStep } = useGame();
  const [copiedLink, setCopiedLink] = useState(false);

  // Formulario manual opcional
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualWish, setManualWish] = useState('');

  const syncService = useMemo(() => new RegistrationSyncService(), []);
  const [inviteUrl, setInviteUrl] = useState<string>('');

  React.useEffect(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.href : '';
    syncService.generateInviteLink(eventConfig, baseUrl).then(url => {
      setInviteUrl(url);
    });
  }, [eventConfig, syncService]);

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

¡No te quedes por fuera! 🥳`;

  const whatsappInviteUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappInviteMessage)}`;

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    addParticipant({
      name: manualName.trim(),
      phone: manualPhone.trim() || undefined,
      giftWish: manualWish.trim() || undefined,
    });

    setManualName('');
    setManualPhone('');
    setManualWish('');
    showToast(`¡${manualName.trim()} agregado a la lista!`, 'success');
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
          Envía el enlace a tus amigos o familiares para que <strong>cada uno se registre y coloque qué regalos quiere</strong>.
          Cuando todos estén anotados, continuaremos a asignar los familiares.
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
          <Sparkles size={20} color="#fbbf24" />
          <h3 style={{ fontSize: '1.25rem', color: '#fff', margin: 0 }}>
            Comparte este enlace para que los jugadores se registren:
          </h3>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Al abrir este enlace, cada participante ingresará su nombre y su lista de deseos de regalo de forma sencilla.
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

      {/* Lista de Jugadores Registrados */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={20} color="#fb7185" />
          <span>Jugadores Registrados hasta el momento:</span>
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

        {participants.length < 3 && (
          <span style={{ fontSize: '0.82rem', color: '#fca5a5' }}>
            * Se necesitan al menos 3 jugadores para realizar el sorteo
          </span>
        )}
      </div>

      {participants.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)', marginBottom: '2rem' }}>
          <Users size={44} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Esperando que los jugadores abran el enlace y se registren...</p>
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
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                        <Phone size={11} color="#4ade80" />
                        <span>{p.phone}</span>
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
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nombre del Jugador *</label>
              <input
                type="text"
                className="form-input"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                placeholder="Ej: Abuelita Carmen"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono (Opcional)</label>
              <input
                type="tel"
                className="form-input"
                value={manualPhone}
                onChange={e => setManualPhone(e.target.value)}
                placeholder="+57 300 000 0000"
              />
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
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
