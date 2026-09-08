import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Gift, Calendar, DollarSign, UserCheck, Send, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { RegistrationSyncService } from '../../infrastructure/services/RegistrationSyncService';
import { formatColombiaDateTime } from '../../core/domain/utils/dateFormatters';
import { showSuccessAlert, showToast } from '../../core/domain/utils/alertUtils';
import { useGame } from '../../context/GameContext';

interface PlayerRegistrationPageProps {
  inviteToken: string;
  onGoHome: () => void;
}

export const PlayerRegistrationPage: React.FC<PlayerRegistrationPageProps> = ({ inviteToken, onGoHome }) => {
  const { addParticipant } = useGame();
  const syncService = useMemo(() => new RegistrationSyncService(), []);
  const eventDetails = useMemo(() => syncService.decodeInvite(inviteToken), [inviteToken, syncService]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [giftWish, setGiftWish] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredPlayerToken, setRegisteredPlayerToken] = useState<string | null>(null);

  if (!eventDetails) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
        <AlertCircle size={48} color="#f87171" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ color: '#f87171' }}>Enlace de registro no válido</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0.75rem auto 1.5rem' }}>
          El enlace de invitación para el registro no es válido o está incompleto. Pide a tu organizador que te reenvíe el enlace oficial por WhatsApp.
        </p>
        <button type="button" className="btn btn-primary" onClick={onGoHome}>
          <ArrowLeft size={16} />
          <span>Ir a la página principal</span>
        </button>
      </div>
    );
  }

  const formattedBudget = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(eventDetails.maxBudget);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('Por favor escribe tu nombre completo', 'warning');
      return;
    }

    // Agregar a la lista local si comparte dispositivo/sesión
    addParticipant({
      name: trimmedName,
      phone: phone.trim() || undefined,
      giftWish: giftWish.trim() || undefined,
    });

    // Generar token para enviar al organizador por WhatsApp
    const playerToken = syncService.encodePlayerData({
      eventId: eventDetails.eventId,
      name: trimmedName,
      phone: phone.trim(),
      giftWish: giftWish.trim(),
      registeredAt: Date.now(),
    });

    setRegisteredPlayerToken(playerToken);
    setIsRegistered(true);

    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#e11d48', '#fb7185', '#fbbf24', '#ffffff'],
    });

    showSuccessAlert(
      `¡Bienvenido(a), ${trimmedName}!`,
      `Te has registrado exitosamente en el sorteo de Amor y Amistad. Envía tu confirmación al organizador.`
    );
  };

  // Mensaje para enviar al organizador por WhatsApp
  const baseUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';
  const confirmUrl = `${baseUrl}#agregar=${registeredPlayerToken || ''}`;
  const whatsappConfirmMessage = 
`👋 ¡Hola! Ya me registré en el sorteo de *Amor y Amistad: ${eventDetails.eventTitle}* 🎁

👤 *Nombre:* ${name}
${phone ? `📱 *Teléfono:* ${phone}\n` : ''}
🎁 *Mis deseos o gustos de regalo:*
"${giftWish || 'Sorpréndeme con tu creatividad'}"

👉 Haz clic aquí para confirmar mi inscripción en el sorteo:
${confirmUrl}`;

  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappConfirmMessage)}`;

  return (
    <motion.div
      className="glass-panel"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      style={{ maxWidth: '640px', margin: '0 auto' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className="brand-badge">
          <Gift size={13} fill="#e11d48" color="#e11d48" />
          <span>Invitación al Sorteo de Amor y Amistad</span>
        </div>
        <h1 style={{ fontSize: '2.2rem', marginTop: '0.25rem' }}>{eventDetails.eventTitle}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.35rem' }}>
          ¡Regístrate a continuación y coloca qué regalos te gustaría recibir para que tu amigo secreto se inspire!
        </p>
      </div>

      {/* Reglas fijas del evento */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          background: 'rgba(13, 8, 22, 0.65)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <DollarSign size={14} color="#fbbf24" />
            <span>VALOR MÁXIMO DEL REGALO</span>
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.2rem' }}>
            $ {formattedBudget} COP
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={14} color="#38bdf8" />
            <span>FECHA DE ENTREGA (COLOMBIA)</span>
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8', marginTop: '0.2rem', fontFamily: 'monospace' }}>
            {formatColombiaDateTime(eventDetails.deliveryDateIso)}
          </div>
        </div>
      </div>

      {!isRegistered ? (
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="player-name">
              <span>Tu Nombre y Apellido *</span>
            </label>
            <input
              id="player-name"
              type="text"
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Laura Gómez"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="player-phone">
              <span>Tu Teléfono / WhatsApp (Opcional)</span>
            </label>
            <input
              id="player-phone"
              type="tel"
              className="form-input"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+57 300 123 4567"
            />
            <span className="form-helper">Para que el organizador pueda enviarte tu sobre secreto.</span>
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label" htmlFor="player-wish">
              <Gift size={15} color="#fbbf24" />
              <span>¿Qué regalos o gustos tienes? (Lista de Deseos) *</span>
            </label>
            <textarea
              id="player-wish"
              className="form-textarea"
              value={giftWish}
              onChange={e => setGiftWish(e.target.value)}
              placeholder="Ej: Chocolates finos, café en grano, velas aromáticas, libro de novela o bufanda."
              required
            />
            <span className="form-helper">
              Tu amigo secreto podrá leer esto en su sobre para acertar con tu regalo.
            </span>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }}>
            <UserCheck size={18} />
            <span>¡Registrarme en el Sorteo!</span>
          </button>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', marginBottom: '1rem' }}>
            <CheckCircle2 size={42} />
          </div>

          <h3 style={{ fontSize: '1.6rem', color: '#fff' }}>¡Registro Completado con Éxito!</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0.5rem auto 1.75rem' }}>
            Tus datos y deseos de regalo han sido guardados. Ahora envía la confirmación a tu organizador por WhatsApp para que la incluya en el sorteo.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '420px', margin: '0 auto' }}>
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp"
              style={{ padding: '0.9rem', fontSize: '1rem' }}
            >
              <Send size={18} />
              <span>Enviar mi Registro al Organizador por WhatsApp</span>
            </a>

            <button type="button" className="btn btn-secondary" onClick={onGoHome} style={{ fontSize: '0.9rem' }}>
              <span>Ir al Inicio</span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
