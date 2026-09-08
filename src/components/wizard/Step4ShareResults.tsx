import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Copy, RotateCcw, Sparkles, Check, Clock, DollarSign, Download, Save, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import type { ShareableItem } from '../../core/application/useCases/DrawUseCases';
import { formatColombiaDateTime } from '../../core/domain/utils/dateFormatters';
import { showToast, showConfirmDialog, showSuccessAlert } from '../../core/domain/utils/alertUtils';

export const Step4ShareResults: React.FC = () => {
  const { eventConfig, pairs, shareableItems, resetDraw, deleteGroupWithPin } = useGame();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = async (item: ShareableItem) => {
    try {
      await navigator.clipboard.writeText(item.shareUrl);
      setCopiedId(item.giver.id);
      showToast(`¡Enlace copiado para ${item.giver.name}!`, 'success');
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      showToast('No se pudo copiar el enlace automáticamente', 'warning');
    }
  };

  // Copiar todos los enlaces juntos
  const handleCopyAllLinks = async () => {
    if (!shareableItems.length) return;
    const formattedList = shareableItems
      .map((item, i) => `${i + 1}. ${item.giver.name}:\n${item.shareUrl}\n`)
      .join('\n');

    const fullText = 
`💌 ENLACES OFICIALES - SORTEO DE AMOR Y AMISTAD
Evento: ${eventConfig.title}
Presupuesto Máximo: ${eventConfig.getFormattedBudget()}
Fecha de Entrega (Colombia): ${eventConfig.getFormattedDeliveryDate()}

${formattedList}`;

    try {
      await navigator.clipboard.writeText(fullText);
      showSuccessAlert(
        '¡Todos los enlaces copiados!',
        'Se han copiado los enlaces cifrados de todos los jugadores al portapapeles para que los envíes individualmente.'
      );
    } catch {
      showToast('Error al copiar todos los enlaces', 'warning');
    }
  };

  // Descargar respaldo confidencial en archivo .txt (sin revelar amigos secretos al admin)
  const handleDownloadBackup = () => {
    if (!pairs || !shareableItems.length) return;

    const linksList = shareableItems
      .map((item, i) => `  ${i + 1}. ${item.giver.name}:\n     Enlace: ${item.shareUrl}`)
      .join('\n\n');

    const nowColombia = formatColombiaDateTime(new Date());

    const fileContent = 
`====================================================================
💌 RESPALDO OFICIAL DE SORTEO DE AMOR Y AMISTAD (COLOMBIA) 🇨🇴
====================================================================

📌 INFORMACIÓN DEL EVENTO:
- Motivo / Título: ${eventConfig.title}
- Presupuesto Máximo: ${eventConfig.getFormattedBudget()}
- Fecha y Hora de Entrega en Colombia: ${eventConfig.getFormattedDeliveryDate()}
${eventConfig.notes ? `- Indicaciones / Lugar: ${eventConfig.notes}\n` : ''}- Fecha del Sorteo: ${nowColombia}
- Total de Jugadores: ${pairs.length}

--------------------------------------------------------------------
🔗 ENLACES SECRETOS INDIVIDUALES PARA CADA JUGADOR:
(Comparte cada enlace únicamente con su dueño por WhatsApp o mensaje)
--------------------------------------------------------------------
${linksList}

--------------------------------------------------------------------
🔒 PRIVACIDAD Y SECRETO ABSOLUTO GARANTIZADO:
--------------------------------------------------------------------
Por seguridad y máxima confidencialidad, las asignaciones son 100% ciegas.
Ni el administrador ni nadie más puede ver a quién le regala cada persona.
Cada jugador descubrirá a su amigo secreto de forma totalmente privada 
únicamente al abrir su sobre cifrado con su respectivo enlace.

====================================================================
¡Sorteo generado con algoritmos de no-autoasignación y exclusión familiar!
Guarda este archivo en tu computador para tener respaldo permanente.
====================================================================`;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const sanitizedTitle = eventConfig.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    link.href = url;
    link.download = `respaldo_sorteo_${sanitizedTitle}_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('¡Archivo de respaldo descargado con éxito!', 'success');
  };

  const handleResetDraw = async () => {
    const confirmed = await showConfirmDialog(
      '¿Volver a Sortear?',
      'Se generará un nuevo emparejamiento aleatorio y secreto respetando las mismas reglas familiares y de presupuesto.',
      'Sí, nuevo sorteo',
      'Cancelar'
    );
    if (confirmed) {
      resetDraw();
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
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            padding: '0.75rem',
            borderRadius: '50%',
            background: 'rgba(225, 29, 72, 0.2)',
            border: '2px solid var(--primary)',
            color: '#fb7185',
            marginBottom: '0.75rem',
          }}
        >
          <Sparkles size={32} />
        </div>
        <h2 style={{ fontSize: '2rem', color: '#fff' }}>¡Sorteo Cifrado con Éxito!</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '620px', margin: '0.4rem auto 0' }}>
          El emparejamiento se realizó cumpliendo todas las exclusiones de familiares bajo secreto absoluto.
        </p>
      </div>

      {/* Aviso de Confidencialidad Extrema (Super Secreto) */}
      <div
        style={{
          background: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.35)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          marginBottom: '1.75rem',
        }}
      >
        <ShieldCheck size={26} color="#fb7185" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.92rem', color: '#fbcfe8' }}>
          <strong style={{ color: '#fff' }}>🔒 100% Super Secreto (Ni el administrador sabe los resultados):</strong> Las asignaciones
          están cifradas punto a punto. Ni tú ni nadie puede espiar a quién le tocó a quién. Cada amigo secreto
          descubrirá su regalo de forma privada únicamente al abrir su sobre digital en su celular.
        </div>
      </div>

      {/* Barra de Confirmación de Guardado y Botones de Respaldo */}
      <div
        style={{
          background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#86efac', fontSize: '0.9rem', fontWeight: 600 }}>
          <CheckCircle2 size={18} />
          <span>💾 Sorteo guardado automáticamente en tu navegador</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
            onClick={handleDownloadBackup}
            title="Descargar copia de seguridad en tu computadora"
          >
            <Download size={14} color="#fbbf24" />
            <span>Descargar Respaldo (.txt)</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
            onClick={handleCopyAllLinks}
            title="Copiar todos los enlaces juntos al portapapeles"
          >
            <Copy size={14} />
            <span>Copiar Todos los Enlaces</span>
          </button>
        </div>
      </div>

      {/* Tarjeta de parámetros del evento */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Clock size={20} color="#fbbf24" />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FECHA Y HORA DE ENTREGA (COLOMBIA)</div>
            <div style={{ fontWeight: 700, color: '#fbbf24', fontFamily: 'monospace' }}>
              {formatColombiaDateTime(eventConfig.deliveryDateIso)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <DollarSign size={20} color="#4ade80" />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PRESUPUESTO MÁXIMO</div>
            <div style={{ fontWeight: 700, color: '#4ade80' }}>
              {eventConfig.getFormattedBudget()}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de enlaces para WhatsApp */}
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Send size={18} color="#25d366" />
        <span>Enviar Sobres Digitales Confidenciales por WhatsApp:</span>
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2.5rem' }}>
        {shareableItems.map((item, index) => (
          <div
            key={item.giver.id}
            style={{
              background: 'rgba(13, 8, 22, 0.65)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.25rem',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '1.1rem', color: '#fff' }}>
                  {index + 1}. {item.giver.name}
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.12)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                  🔒 Sobre Cifrado
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {item.giver.phone ? `WhatsApp: ${item.giver.phone}` : 'Enlace privado listo'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {/* Botón Compartir por WhatsApp */}
              <a
                href={item.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp"
                style={{ padding: '0.6rem 1.1rem', fontSize: '0.88rem' }}
              >
                <Send size={15} />
                <span>Enviar por WhatsApp</span>
              </a>

              {/* Botón Copiar Link */}
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.6rem 1rem', fontSize: '0.88rem' }}
                onClick={() => handleCopyLink(item)}
              >
                {copiedId === item.giver.id ? <Check size={15} color="#4ade80" /> : <Copy size={15} />}
                <span>{copiedId === item.giver.id ? '¡Copiado!' : 'Copiar Enlace'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Botones de acción inferior */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={handleResetDraw}>
            <RotateCcw size={16} />
            <span>Volver a Sortear</span>
          </button>

          <button
            type="button"
            className="btn btn-danger-outline"
            onClick={deleteGroupWithPin}
            style={{ padding: '0.6rem 1rem' }}
            title="Eliminar este grupo y reiniciar con PIN 471414"
          >
            <Lock size={15} />
            <span>Borrar Grupo (PIN: 471414)</span>
          </button>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            showSuccessAlert(
              '¡Sorteo Confidencial Guardado!',
              'Tu sorteo está guardado en el navegador de forma 100% privada. Ningún administrador conoce los resultados.'
            );
          }}
        >
          <Save size={16} />
          <span>Sorteo Guardado</span>
        </button>
      </div>
    </motion.div>
  );
};
