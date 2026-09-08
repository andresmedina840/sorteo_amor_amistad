-- =========================================================================
-- Sorteo Amor y Amistad - Esquema de Base de Datos para Supabase (PostgreSQL)
-- Copia y pega este script en el SQL Editor de tu proyecto en Supabase
-- =========================================================================

-- 1. Tabla de Grupos / Eventos del Sorteo
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

-- 2. Tabla de Participantes / Jugadores Registrados
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

-- 3. Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_sorteo_participants_group ON sorteo_participants(group_id);

-- 4. Habilitar Seguridad a Nivel de Fila (Row Level Security - RLS)
ALTER TABLE sorteo_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE sorteo_participants ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de acceso público (Lectura, Inserción, Actualización y Eliminación)
DROP POLICY IF EXISTS "Acceso público grupos" ON sorteo_groups;
CREATE POLICY "Acceso público grupos"
  ON sorteo_groups
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso público participantes" ON sorteo_participants;
CREATE POLICY "Acceso público participantes"
  ON sorteo_participants
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Habilitar Realtime para actualización en vivo de participantes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'sorteo_groups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sorteo_groups;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'sorteo_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sorteo_participants;
  END IF;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
