import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, DollarSign, FileText, ArrowRight, Clock, Gift, Lock, Save } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import {
  formatColombiaDateTime,
  toInputDateTimeLocal,
  fromInputToIsoString,
} from '../../core/domain/utils/dateFormatters';
import { showToast } from '../../core/domain/utils/alertUtils';

export const Step1EventConfig: React.FC = () => {
  const { eventConfig, updateEventConfig, setStep, deleteGroupWithPin } = useGame();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = fromInputToIsoString(e.target.value);
    if (iso) {
      updateEventConfig({ deliveryDateIso: iso });
    }
  };

  // Formateador con separador de miles colombiano (ej: 60.000)
  const formatMilesColombia = (val: number): string => {
    if (!val || isNaN(val)) return '';
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(val);
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    const num = rawDigits ? parseInt(rawDigits, 10) : 0;
    updateEventConfig({ maxBudget: num, currency: 'COP' });
  };

  const quickBudgets = [30000, 50000, 80000, 100000];

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
          <Gift color="#fb7185" />
          <span>Configuración del Evento</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Define los parámetros principales: presupuesto máximo para el regalo y la fecha de entrega con hora colombiana.
        </p>
      </div>

      <div className="form-grid">
        {/* Título del evento */}
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label" htmlFor="event-title">
            <FileText size={16} color="#fb7185" />
            <span>Nombre o Motivo del Juego *</span>
          </label>
          <input
            id="event-title"
            type="text"
            className="form-input"
            value={eventConfig.title}
            onChange={e => updateEventConfig({ title: e.target.value })}
            placeholder="Ej: Amigo Secreto Oficina 2026 / Familia Gómez"
            required
          />
          <span className="form-helper">Este nombre aparecerá en la invitación y sobres digitales.</span>
        </div>

        {/* Valor Máximo del Regalo en Pesos Colombianos (COP) con separador de miles */}
        <div className="form-group">
          <label className="form-label" htmlFor="max-budget">
            <DollarSign size={16} color="#fbbf24" />
            <span>Valor Máximo del Regalo (Pesos Colombianos) *</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(225, 29, 72, 0.18)',
                border: '1px solid var(--border-subtle)',
                borderRight: 'none',
                borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
                padding: '0 1rem',
                color: '#fbbf24',
                fontWeight: 700,
                fontSize: '0.95rem',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span>$ COP</span>
            </div>
            <input
              id="max-budget"
              type="text"
              inputMode="numeric"
              className="form-input"
              style={{
                borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#fbbf24',
                letterSpacing: '0.02em',
              }}
              value={formatMilesColombia(eventConfig.maxBudget)}
              onChange={handleBudgetChange}
              placeholder="60.000"
            />
          </div>

          {/* Atajos de presupuesto en pesos colombianos */}
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {quickBudgets.map(amount => (
              <button
                key={amount}
                type="button"
                onClick={() => updateEventConfig({ maxBudget: amount, currency: 'COP' })}
                style={{
                  background: eventConfig.maxBudget === amount ? 'rgba(225, 29, 72, 0.35)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${eventConfig.maxBudget === amount ? 'var(--primary)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-sm)',
                  color: eventConfig.maxBudget === amount ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.78rem',
                  padding: '0.25rem 0.6rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
              >
                ${(amount / 1000)}k COP
              </button>
            ))}
          </div>

          <span className="form-helper">
            Presupuesto fijado: <strong style={{ color: '#fbbf24' }}>{eventConfig.getFormattedBudget()}</strong>
          </span>
        </div>

        {/* Fecha y Hora de Entrega (Formato Colombia dd/mm/yyyy hh:mm:ss am/pm) */}
        <div className="form-group">
          <label className="form-label" htmlFor="delivery-date">
            <Calendar size={16} color="#38bdf8" />
            <span>Fecha y Hora de Entrega *</span>
            <span className="colombia-badge">🇨🇴 Colombia</span>
          </label>

          <input
            id="delivery-date"
            type="datetime-local"
            className="form-input"
            value={toInputDateTimeLocal(eventConfig.deliveryDateIso)}
            onChange={handleDateChange}
            required
          />

          {/* Vista previa con formato exacto dd/mm/yyyy hh:mm:ss am o pm */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(251, 191, 36, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.25)',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              marginTop: '0.4rem',
            }}
          >
            <Clock size={15} color="#fbbf24" />
            <div style={{ fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Formato Colombia (dd/mm/yyyy hh:mm:ss am/pm): </span>
              <strong style={{ color: '#fbbf24', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                {formatColombiaDateTime(eventConfig.deliveryDateIso)}
              </strong>
            </div>
          </div>
        </div>

        {/* Indicaciones / Lugar / Reglas opcionales */}
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label" htmlFor="event-notes">
            <FileText size={16} color="#a78bfa" />
            <span>Lugar o Indicaciones Especiales (Opcional)</span>
          </label>
          <textarea
            id="event-notes"
            className="form-textarea"
            value={eventConfig.notes}
            onChange={e => updateEventConfig({ notes: e.target.value })}
            placeholder="Ej: Nos reuniremos en la casa de Andrea. Habrá endulzada previa con chocolates los viernes."
          />
        </div>
      </div>

      {/* Botones de Acción: Guardar y Borrar con PIN */}
      <div className="step-nav-buttons" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button
          type="button"
          className="btn btn-danger-outline"
          style={{ padding: '0.65rem 1.1rem', fontSize: '0.88rem' }}
          onClick={deleteGroupWithPin}
          title="Borrar grupo y reiniciar todo"
        >
          <Lock size={15} />
          <span>Borrar Grupo</span>
        </button>

        <button
          type="button"
          className="btn btn-primary"
          style={{ fontSize: '1.05rem', padding: '0.95rem 1.85rem' }}
          onClick={() => {
            showToast('¡Grupo guardado con éxito! Ahora comparte el enlace de registro', 'success');
            setStep(2);
          }}
          disabled={!eventConfig.title.trim()}
        >
          <Save size={18} />
          <span>Guardar Grupo y Generar Enlace de Registro</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </motion.div>
  );
};
