-- Add invoice and category support for remittances (SECTOR 3)
-- Ejecutar en Supabase: SQL Editor → New query → Pegar y Run

-- Remittances: link to purchase invoice (expenses)
ALTER TABLE remittances
  ADD COLUMN IF NOT EXISTS invoice_id uuid;

ALTER TABLE remittances
  ADD COLUMN IF NOT EXISTS premise_id uuid;

ALTER TABLE remittances
  ADD COLUMN IF NOT EXISTS depot_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'remittances_invoice_id_fkey'
  ) THEN
    ALTER TABLE remittances
      ADD CONSTRAINT remittances_invoice_id_fkey
      FOREIGN KEY (invoice_id)
      REFERENCES expenses(id);
  END IF;
END $$;

-- Remittance items: store product category
ALTER TABLE remittance_items
  ADD COLUMN IF NOT EXISTS category text;

-- Optional columns used by reception flow (safe if already present)
ALTER TABLE remittance_items
  ADD COLUMN IF NOT EXISTS batch_number text;

ALTER TABLE remittance_items
  ADD COLUMN IF NOT EXISTS batch_expiry_date date;
