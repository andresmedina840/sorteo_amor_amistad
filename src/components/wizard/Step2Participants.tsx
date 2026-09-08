import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Trash2, HeartCrack, Phone, Gift, ArrowLeft, ArrowRight, ShieldCheck, AlertCircle, UserCheck } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { Participant } from '../../core/domain/entities/Participant';
import { FamilySelectorModal } from './FamilySelectorModal';
import { showConfirmDialog, showToast } from '../../core/domain/utils/alertUtils';

export const Step2Participants: React.FC = () => {
  const { participants, addParticipant, removeParticipant, setStep, feasibility, toggleFamilyExclusion } = useGame();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [giftWish, setGiftWish] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Participante seleccionado para gestionar sus familiares en el modal
  const [selectedParticipantForFamily, setSelectedParticipantForFamily] = useState<Participant | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Por favor escribe el nombre del participante.');
      return;
    }

    addParticipant({
      name: name.trim(),
      phone: phone.trim() || undefined,
      giftWish: giftWish.trim() || undefined,
    });

    setName('');
    setPhone('');
    setGiftWish('');
    setFormError(null);
    showToast(`¡${name.trim()} agregado! Ahora puedes asignarle sus familiares.`, 'success');
  };

  const handleRemove = async (participant: Participant) => {
    const confirmed = await showConfirmDialog(
      `¿Eliminar a ${participant.name}?`,
      'Se removerá del sorteo y también de las exclusiones familiares de los demás.',
      'Sí, eliminar',
      'Cancelar'
    );
    if (confirmed) {
      removeParticipant(participant.id);
      showToast(`Participante ${participant.name} eliminado`, 'info');
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
      <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Users color="#fb7185" />
          <span>Jugadores y Asignación de Familiares</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Registra a cada participante y haz clic en <strong>"Asignar Familiares"</strong> para marcar
          exactamente quiénes son sus parientes o pareja para que <strong>NO le salgan en el sorteo</strong>.
        </p>
      </div>

      {/* Regla explicada con botón de asignación rápida */}
      <div
        style={{
          background: 'rgba(225, 29, 72, 0.08)',
          border: '1px solid rgba(225, 29, 72, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldCheck size={24} color="#fb7185" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: '#fff' }}>¿Cómo evitar que salgan familiares?:</strong> Elige a cualquier jugador de la lista
            y marca quiénes son sus familiares. El sistema garantiza matemáticamente que <strong>nunca se regalarán entre ellos</strong>.
          </div>
        </div>

        {participants.length >= 2 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select
              className="form-select"
              style={{ maxWidth: '240px', padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
              onChange={e => {
                const target = participants.find(p => p.id === e.target.value);
                if (target) setSelectedParticipantForFamily(target);
              }}
              value=""
            >
              <option value="">-- Elegir jugador para asignar familiares --</option>
              {participants.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Formulario para registrar participante */}
      <form onSubmit={handleAdd} style={{ background: 'rgba(13, 8, 22, 0.6)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '2rem' }}>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="participant-name">
              <span>Nombre del Jugador *</span>
            </label>
            <input
              id="participant-name"
              type="text"
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Daniel Restrepo"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="phone-number">
              <Phone size={15} color="#4ade80" />
              <span>Teléfono / WhatsApp (Opcional)</span>
            </label>
            <input
              id="phone-number"
              type="tel"
              className="form-input"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+57 300 123 4567"
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" htmlFor="gift-wish">
              <Gift size={15} color="#fbbf24" />
              <span>Deseos de regalo o gustos (Opcional)</span>
            </label>
            <input
              id="gift-wish"
              type="text"
              className="form-input"
              value={giftWish}
              onChange={e => setGiftWish(e.target.value)}
              placeholder="Ej: Café especial, dulces, camiseta talla M, libros"
            />
          </div>
        </div>

        {formError && (
          <div className="alert-box alert-error" style={{ margin: '0.75rem 0' }}>
            <AlertCircle size={18} />
            <span>{formError}</span>
          </div>
        )}

        <div style={{ marginTop: '1.2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.7rem 1.5rem', fontSize: '0.95rem' }}>
            <UserPlus size={16} />
            <span>Agregar Jugador</span>
          </button>
        </div>
      </form>

      {/* Lista de Participantes Registrados */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Lista de Jugadores Registrados</span>
          <span
            style={{
              background: 'rgba(225, 29, 72, 0.15)',
              border: '1px solid rgba(225, 29, 72, 0.3)',
              padding: '0.15rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              color: '#fb7185',
              fontWeight: 700,
            }}
          >
            {participants.length}
          </span>
        </h3>
        {participants.length < 3 && (
          <span style={{ fontSize: '0.82rem', color: '#f87171' }}>
            * Se requieren mínimo 3 jugadores
          </span>
        )}
      </div>

      {participants.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <Users size={48} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
          <p>No hay jugadores registrados todavía. Ingresa los nombres en el formulario arriba.</p>
        </div>
      ) : (
        <div className="participants-list">
          <AnimatePresence>
            {participants.map((p, index) => {
              // Obtener la lista de nombres de familiares asignados
              const assignedFamilyMembers = participants.filter(other => p.cannotGiftTo(other) && other.id !== p.id);

              return (
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

                  {/* Sección de Familiares Asignados con Botón de Asignación */}
                  <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <HeartCrack size={12} color="#fb7185" />
                        <span>Familiares (NO le saldrán):</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedParticipantForFamily(p)}
                        style={{
                          background: 'rgba(225, 29, 72, 0.2)',
                          border: '1px solid var(--primary)',
                          color: '#fbcfe8',
                          padding: '0.25rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <UserCheck size={12} />
                        <span>Asignar Familiares</span>
                      </button>
                    </div>

                    {assignedFamilyMembers.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.4rem' }}>
                        {assignedFamilyMembers.map(fam => (
                          <span
                            key={fam.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              background: 'rgba(225, 29, 72, 0.18)',
                              border: '1px solid rgba(225, 29, 72, 0.4)',
                              borderRadius: 'var(--radius-full)',
                              padding: '0.15rem 0.55rem',
                              fontSize: '0.75rem',
                              color: '#fbcfe8',
                            }}
                          >
                            <span>🚫 {fam.name}</span>
                            <button
                              type="button"
                              onClick={() => toggleFamilyExclusion(p.id, fam.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#f87171',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '0.85rem',
                                lineHeight: 1,
                              }}
                              title={`Desmarcar a ${fam.name} como familiar`}
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#86efac', fontStyle: 'italic', marginTop: '0.2rem' }}>
                        Sin familiares asignados (puede regalarle a cualquiera)
                      </div>
                    )}
                  </div>

                  {p.giftWish && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', background: 'rgba(255, 255, 255, 0.04)', padding: '0.35rem 0.6rem', borderRadius: 'var(--radius-sm)', color: '#fde68a' }}>
                      <strong>Deseo:</strong> {p.giftWish}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Alerta de Viabilidad */}
      {!feasibility.isFeasible && participants.length >= 3 && (
        <div className="alert-box alert-warning" style={{ marginTop: '1.5rem' }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Aviso de Restricciones:</strong> {feasibility.reason}
          </div>
        </div>
      )}

      {/* Modal interactivo de asignación de familiares */}
      <FamilySelectorModal
        participant={selectedParticipantForFamily}
        onClose={() => setSelectedParticipantForFamily(null)}
      />

      {/* Botones de Navegación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
          <ArrowLeft size={18} />
          <span>Volver a Configuración</span>
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setStep(3)}
          disabled={participants.length < 3 || !feasibility.isFeasible}
        >
          <span>Continuar a Validación y Sorteo</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </motion.div>
  );
};
