import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Gift, Calendar, DollarSign, UserCheck, ArrowLeft, CheckCircle2, AlertCircle, Sparkles, Loader2, Phone } from 'lucide-react';
import confetti from 'canvas-confetti';
import { RegistrationSyncService } from '../../infrastructure/services/RegistrationSyncService';
import { formatColombiaDateTime } from '../../core/domain/utils/dateFormatters';
import { validateColombiaPhone, formatColombiaPhone } from '../../core/domain/utils/phoneUtils';
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
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [giftWish, setGiftWish] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  if (!eventDetails) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
        <AlertCircle size={48} color="#f87171" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ color: '#f87171' }}>Enlace de registro no válido</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0.75rem auto 1.5rem' }}>
          El enlace de invitación para el registro no es válido o está incompleto. Pide a tu organizador que te reenvíe el enlace oficial.
        </p>
        <button type="button" className="btn btn-primary" onClick={onGoHome}>
          <ArrowLeft size={16} />
          <span>Ir a la página principal</span>
        </button>
      </div>
    );
  }

  const formattedBudget = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(eventDetails.maxBudget);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permitir solo números y limitar a 10 dígitos
    let val = e.target.value.replace(/\D/g, '');
    
    // Si pegan con prefijo 57 y tiene más de 10 dígitos
    if (val.length > 10 && val.startsWith('57')) {
      val = val.substring(2);
    }
    
    if (val.length > 10) {
      val = val.substring(0, 10);
    }
    
    setPhone(val);

    // Validación interactiva
    if (val.length > 0 && !val.startsWith('3')) {
      setPhoneError('En Colombia el celular debe iniciar por el número 3 (ej: 300, 315, 320...)');
    } else if (val.length > 0 && val.length < 10) {
      setPhoneError(`Faltan ${10 - val.length} dígitos (debe tener exactamente 10 dígitos)`);
    } else {
      setPhoneError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('Por favor escribe tu nombre completo', 'warning');
      return;
    }

    // Validación estricta del número de celular en Colombia
    const phoneValidation = validateColombiaPhone(phone);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.errorMessage || 'Número de celular no válido');
      showToast(phoneValidation.errorMessage || 'El número de WhatsApp es obligatorio y debe tener 10 dígitos iniciando en 3', 'warning');
      return;
    }

    if (!giftWish.trim()) {
      showToast('Por favor coloca qué regalos te gustaría recibir', 'warning');
      return;
    }

    setIsSubmitting(true);
    setPhoneError(null);

    const cleanPhoneNumber = phoneValidation.cleanPhone;

    // 1. Agregar a la sesión local por si comparte el mismo navegador
    try {
      addParticipant({
        name: trimmedName,
        phone: cleanPhoneNumber,
        giftWish: giftWish.trim() || undefined,
      });
    } catch {}

    // 2. Guardar 100% AUTOMÁTICO en la nube
    const playerData = {
      id: 'pl_' + Math.random().toString(36).substring(2, 9),
      eventId: eventDetails.eventId,
      name: trimmedName,
      phone: cleanPhoneNumber,
      giftWish: giftWish.trim(),
      registeredAt: Date.now(),
    };

    const cloudSuccess = await syncService.registerPlayerInCloud(eventDetails.cloudRoomId, playerData);

    setIsSubmitting(false);
    setIsRegistered(true);

    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#e11d48', '#fb7185', '#fbbf24', '#22c55e', '#ffffff'],
    });

    if (cloudSuccess) {
      showSuccessAlert(
        `¡Registro Exitoso, ${trimmedName}!`,
        `Te has inscrito <strong>100% automáticamente</strong> en el sorteo de <strong>${eventDetails.eventTitle}</strong>.<br/><br/>Tu WhatsApp <strong>+57 ${formatColombiaPhone(cleanPhoneNumber)}</strong> y lista de regalos ya están guardados en la pantalla del organizador. <strong>Ya puedes cerrar esta ventana con total tranquilidad.</strong>`
      );
    } else {
      showSuccessAlert(
        `¡Registro Recibido, ${trimmedName}!`,
        `Tu inscripción para <strong>${eventDetails.eventTitle}</strong> ha sido procesada. Puedes cerrar esta ventana con total tranquilidad.`
      );
    }
  };

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
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="player-phone">
              <Phone size={15} color="#4ade80" />
              <span>Número de WhatsApp / Celular (Colombia) *</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 0.9rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>🇨🇴</span>
                <span>+57</span>
              </div>
              <input
                id="player-phone"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                className="form-input"
                style={{
                  flex: 1,
                  borderColor: phoneError ? '#f87171' : undefined,
                  fontSize: '1.05rem',
                  letterSpacing: '0.04em',
                }}
                value={phone}
                onChange={handlePhoneChange}
                placeholder="3001234567"
                required
                disabled={isSubmitting}
              />
            </div>
            {phoneError ? (
              <div style={{ color: '#f87171', fontSize: '0.82rem', marginTop: '0.35rem', fontWeight: 500 }}>
                ⚠️ {phoneError}
              </div>
            ) : (
              <span className="form-helper">
                <strong>Obligatorio:</strong> Exactamente 10 dígitos iniciando en 3 (ej: 300 123 4567). Se usará para enviarte tu sobre secreto.
              </span>
            )}
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
              disabled={isSubmitting}
              rows={3}
            />
            <span className="form-helper">
              Tu amigo secreto podrá leer esto en su sobre secreto para acertar con tu regalo.
            </span>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="spin-animation" />
                <span>Guardando automáticamente en el sorteo...</span>
              </>
            ) : (
              <>
                <UserCheck size={20} />
                <span>¡Registrarme en el Sorteo!</span>
              </>
            )}
          </button>
          <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            🔒 Tu registro se guardará 100% de forma automática en la nube.
          </div>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '1.25rem',
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#4ade80',
              marginBottom: '1rem',
              border: '2px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <CheckCircle2 size={54} />
          </div>

          <div className="brand-badge" style={{ margin: '0 auto 0.75rem', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
            <Sparkles size={14} color="#4ade80" />
            <span>INSCRIPCIÓN 100% CONFIRMADA</span>
          </div>

          <h3 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '0.5rem' }}>
            ¡Listo, {name}!
          </h3>
          
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              maxWidth: '480px',
              margin: '1.25rem auto',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              RESUMEN DE TU INSCRIPCIÓN:
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
              👤 {name}
            </div>
            <div style={{ fontSize: '0.95rem', color: '#4ade80', marginTop: '0.25rem', fontWeight: 600 }}>
              📱 🇨🇴 +57 {formatColombiaPhone(phone)}
            </div>
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: 600 }}>Tus deseos de regalo:</span>
              <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
                "{giftWish}"
              </div>
            </div>
          </div>

          <p style={{ color: '#4ade80', fontWeight: 600, fontSize: '1rem', maxWidth: '480px', margin: '0.5rem auto 1.5rem' }}>
            ✅ Tu organizador ya tiene tus datos registrados en su pantalla en tiempo real.
          </p>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '460px', margin: '0 auto 1.75rem' }}>
            Ya no tienes que realizar ninguna otra acción. <strong>Puedes cerrar esta ventana de tu navegador con total tranquilidad.</strong>
          </p>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onGoHome}
            style={{ padding: '0.75rem 1.5rem', margin: '0 auto' }}
          >
            <span>Ir al Inicio</span>
          </button>
        </div>
      )}
    </motion.div>
  );
};
