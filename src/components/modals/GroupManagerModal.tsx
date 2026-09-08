import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderKanban, Plus, Check, Trash2, Calendar, Users, DollarSign, X, RefreshCw } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { LocalStorageAdapter, type GroupSummary } from '../../infrastructure/storage/LocalStorageAdapter';
import { SupabaseStorageService } from '../../infrastructure/storage/SupabaseStorageService';
import { isSupabaseConfigured } from '../../infrastructure/storage/supabaseClient';
import { formatColombiaDateTime } from '../../core/domain/utils/dateFormatters';
import { showToast, showConfirmDialog } from '../../core/domain/utils/alertUtils';

interface GroupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GroupManagerModal: React.FC<GroupManagerModalProps> = ({ isOpen, onClose }) => {
  const { eventConfig, switchGroup, createNewGroup } = useGame();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadAllGroups = async () => {
    setIsLoading(true);
    try {
      const localSummaries = LocalStorageAdapter.getGroupsSummary();

      if (isSupabaseConfigured()) {
        const cloudSummaries = await SupabaseStorageService.getAllGroups();
        // Combinar evitando duplicados por ID
        const map = new Map<string, GroupSummary>();
        localSummaries.forEach(g => map.set(g.id, g));
        cloudSummaries.forEach(g => {
          map.set(g.id, {
            id: g.id,
            title: g.title,
            maxBudget: g.maxBudget,
            deliveryDateIso: g.deliveryDateIso,
            participantsCount: g.participantsCount,
            hasDrawn: g.hasDrawn,
            updatedAt: g.updatedAt,
          });
        });
        setGroups(Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt));
      } else {
        setGroups(localSummaries);
      }
    } catch (err) {
      console.warn('Error al listar grupos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAllGroups();
    }
  }, [isOpen]);

  const handleSelectGroup = async (groupId: string) => {
    if (groupId === eventConfig.id) {
      onClose();
      return;
    }

    const ok = await switchGroup(groupId);
    if (ok) {
      showToast('¡Grupo cargado con éxito!', 'success');
      onClose();
    } else {
      showToast('No se pudo cargar el grupo seleccionado', 'warning');
    }
  };

  const handleCreateNew = () => {
    createNewGroup();
    showToast('¡Nuevo grupo creado! Configura los datos principales.', 'success');
    onClose();
  };

  const handleDeleteGroup = async (groupId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const confirmed = await showConfirmDialog(
      '¿Eliminar Grupo?',
      `¿Estás seguro de que deseas eliminar permanentemente el grupo "${title}"? Esta acción no se puede deshacer.`,
      'Sí, eliminar',
      'Cancelar'
    );

    if (confirmed) {
      LocalStorageAdapter.deleteGroup(groupId);
      if (isSupabaseConfigured()) {
        await SupabaseStorageService.deleteGroup(groupId);
      }
      showToast(`Grupo "${title}" eliminado`, 'success');

      // Si se eliminó el grupo que estaba activo en pantalla, cargar otro
      if (groupId === eventConfig.id) {
        const remaining = groups.filter(g => g.id !== groupId);
        if (remaining.length > 0) {
          await switchGroup(remaining[0].id);
        } else {
          createNewGroup();
        }
      }

      loadAllGroups();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '1rem',
        }}
        onClick={onClose}
      >
        <motion.div
          className="glass-panel"
          style={{
            maxWidth: '640px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            position: 'relative',
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Botón cerrar */}
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>

          {/* Encabezado */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(225, 29, 72, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                }}
              >
                <FolderKanban size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Mis Grupos de Sorteo</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Organiza múltiples eventos, cambia entre ellos o crea uno nuevo.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateNew}
              style={{ padding: '0.55rem 1rem', fontSize: '0.88rem' }}
            >
              <Plus size={16} />
              <span>Crear Nuevo Grupo</span>
            </button>
          </div>

          {/* Lista de grupos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="spin-animation" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
                <span>Cargando tus grupos...</span>
              </div>
            ) : groups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <FolderKanban size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                <p style={{ margin: 0, fontWeight: 600 }}>Aún no tienes grupos guardados</p>
                <p style={{ margin: '0.25rem 0 1rem', fontSize: '0.85rem' }}>Crea tu primer grupo para comenzar a registrar participantes.</p>
                <button type="button" className="btn btn-primary" onClick={handleCreateNew}>
                  <Plus size={16} />
                  <span>Crear Primer Grupo</span>
                </button>
              </div>
            ) : (
              groups.map(group => {
                const isActive = group.id === eventConfig.id;
                return (
                  <div
                    key={group.id}
                    onClick={() => handleSelectGroup(group.id)}
                    style={{
                      padding: '1rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      background: isActive ? 'rgba(225, 29, 72, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: isActive ? '#fb7185' : 'var(--text-primary)' }}>
                          {group.title}
                        </h4>
                        {isActive && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: 'var(--primary)',
                              color: '#fff',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '999px',
                            }}
                          >
                            Activo
                          </span>
                        )}
                        {group.hasDrawn && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: 'rgba(34, 197, 94, 0.2)',
                              color: '#22c55e',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '999px',
                            }}
                          >
                            Sorteado 🎉
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Users size={13} color="#38bdf8" />
                          <span>{group.participantsCount} participantes</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <DollarSign size={13} color="#fbbf24" />
                          <span>${new Intl.NumberFormat('es-CO').format(group.maxBudget)} COP</span>
                        </span>
                        {group.deliveryDateIso && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Calendar size={13} color="#a78bfa" />
                            <span>{formatColombiaDateTime(group.deliveryDateIso)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                        onClick={() => handleSelectGroup(group.id)}
                      >
                        {isActive ? <Check size={14} /> : null}
                        <span>{isActive ? 'En pantalla' : 'Abrir'}</span>
                      </button>

                      {groups.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-danger-outline"
                          style={{ padding: '0.45rem', fontSize: '0.82rem' }}
                          title="Eliminar este grupo"
                          onClick={e => handleDeleteGroup(group.id, group.title, e)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pie del modal: estado de sincronización */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>
              {isSupabaseConfigured() ? '☁️ Sincronización en la nube activa (Supabase)' : '💾 Almacenamiento local seguro'}
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
