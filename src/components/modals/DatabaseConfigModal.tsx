import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, X, CheckCircle2, AlertCircle, Key, Globe, Copy, Check, RefreshCw } from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection, isSupabaseConfigured } from '../../infrastructure/storage/supabaseClient';
import { showToast } from '../../core/domain/utils/alertUtils';

interface DatabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const DatabaseConfigModal: React.FC<DatabaseConfigModalProps> = ({ isOpen, onClose, onConfigUpdated }) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
      setTestResult(null);
    }
  }, [isOpen]);

  const handleSave = async () => {
    saveSupabaseConfig(url, anonKey);
    onConfigUpdated();
    showToast('Credenciales de base de datos guardadas en el navegador', 'success');

    if (url && anonKey) {
      await handleTest();
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    saveSupabaseConfig(url, anonKey);
    const res = await testSupabaseConnection();
    setTestResult(res);
    setIsTesting(false);
  };

  const copySqlScript = () => {
    const sql = `-- Tablas de Sorteo Amor y Amistad para Supabase
CREATE TABLE IF NOT EXISTS sorteo_groups (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  max_budget NUMERIC DEFAULT 60000,
  currency TEXT DEFAULT 'COP',
  delivery_date_iso TIMESTAMPTZ NOT NULL,
  notes TEXT DEFAULT '',
  pairs JSONB DEFAULT NULL,
  step INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sorteo_participants (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES sorteo_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  gift_wish TEXT DEFAULT '',
  family_id TEXT DEFAULT NULL,
  excluded_participant_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sorteo_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE sorteo_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso público grupos" ON sorteo_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso público participantes" ON sorteo_participants FOR ALL USING (true) WITH CHECK (true);`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    showToast('¡Script SQL copiado al portapapeles!', 'success');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  if (!isOpen) return null;

  const isConnected = isSupabaseConfigured();

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
          zIndex: 9999,
          padding: '1rem',
        }}
        onClick={onClose}
      >
        <motion.div
          className="glass-panel"
          style={{
            maxWidth: '560px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#22c55e',
              }}
            >
              <Database size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Base de Datos Supabase (PostgreSQL)</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Guarda tus grupos y participantes de forma permanente para que los enlaces nunca expiren.
              </p>
            </div>
          </div>

          {/* Estado actual */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: isConnected ? 'rgba(34, 197, 94, 0.12)' : 'rgba(234, 179, 8, 0.12)',
              border: `1px solid ${isConnected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: isConnected ? '#22c55e' : '#eab308',
                }}
              />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                {isConnected ? 'Supabase Conectado y Activo' : 'Modo Almacenamiento Local (Sin Servidor)'}
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {isConnected ? 'Base de datos en la nube' : 'Configura tus credenciales abajo'}
            </span>
          </div>

          {/* Formulario de credenciales */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                <Globe size={15} color="#38bdf8" />
                <span>Project URL de Supabase</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="https://xyzabcdefghijklm.supabase.co"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                <Key size={15} color="#fbbf24" />
                <span>Anon Key (Public API Key)</span>
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={e => setAnonKey(e.target.value)}
              />
            </div>
          </div>

          {/* Resultado de prueba */}
          {testResult && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: testResult.success ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${testResult.success ? '#22c55e' : '#ef4444'}`,
                marginBottom: '1.25rem',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {testResult.success ? <CheckCircle2 color="#22c55e" size={18} /> : <AlertCircle color="#ef4444" size={18} />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTest}
              disabled={isTesting || !url || !anonKey}
              style={{ flex: 1, padding: '0.65rem 1rem', fontSize: '0.9rem' }}
            >
              <RefreshCw size={15} className={isTesting ? 'spin-animation' : ''} />
              <span>{isTesting ? 'Probando...' : 'Probar Conexión'}</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              style={{ flex: 1, padding: '0.65rem 1rem', fontSize: '0.9rem' }}
            >
              <CheckCircle2 size={16} />
              <span>Guardar Credenciales</span>
            </button>
          </div>

          {/* Script SQL para crear las tablas */}
          <div
            style={{
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                📋 Tablas requeridas en Supabase (SQL)
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                onClick={copySqlScript}
              >
                {copiedSql ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
                <span>{copiedSql ? 'Copiado' : 'Copiar Script SQL'}</span>
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Copia este script y ejecútalo con un solo clic en el <strong>SQL Editor</strong> de tu proyecto en Supabase para crear las tablas con seguridad habilitada.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
