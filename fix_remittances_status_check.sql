-- Corrige el check constraint de status en remittances para incluir todos los valores que usa la app.
-- Ejecutar en Supabase: SQL Editor → New query → Pegar y Run

-- 1. Eliminar el constraint actual (si existe)
ALTER TABLE remittances
  DROP CONSTRAINT IF EXISTS remittances_status_check;

-- 2. Crear el constraint con todos los estados usados por la aplicación
ALTER TABLE remittances
  ADD CONSTRAINT remittances_status_check
  CHECK (
    status IS NULL
    OR status IN (
      'pending',
      'sent',
      'in_transit',
      'received',
      'partially_received',
      'cancelled'
    )
  );
