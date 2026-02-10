-- Add stock traceability fields for SECTOR 4 (inputs & stock)

-- Inputs: stock status
ALTER TABLE inputs
  ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'disponible';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inputs_stock_status_check'
  ) THEN
    ALTER TABLE inputs
      ADD CONSTRAINT inputs_stock_status_check
      CHECK (stock_status IN ('disponible', 'reservado', 'bloqueado'));
  END IF;
END $$;

-- Input movements: traceability references
ALTER TABLE input_movements
  ADD COLUMN IF NOT EXISTS firm_id uuid;

ALTER TABLE input_movements
  ADD COLUMN IF NOT EXISTS premise_id uuid;

ALTER TABLE input_movements
  ADD COLUMN IF NOT EXISTS remittance_id uuid;

ALTER TABLE input_movements
  ADD COLUMN IF NOT EXISTS purchase_order_id uuid;

ALTER TABLE input_movements
  ADD COLUMN IF NOT EXISTS invoice_id uuid;

ALTER TABLE input_movements
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE input_movements
  ADD COLUMN IF NOT EXISTS document_reference text;

ALTER TABLE input_movements
  ADD COLUMN IF NOT EXISTS batch_number text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'input_movements_firm_id_fkey'
  ) THEN
    ALTER TABLE input_movements
      ADD CONSTRAINT input_movements_firm_id_fkey
      FOREIGN KEY (firm_id)
      REFERENCES firms(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'input_movements_premise_id_fkey'
  ) THEN
    ALTER TABLE input_movements
      ADD CONSTRAINT input_movements_premise_id_fkey
      FOREIGN KEY (premise_id)
      REFERENCES premises(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'input_movements_remittance_id_fkey'
  ) THEN
    ALTER TABLE input_movements
      ADD CONSTRAINT input_movements_remittance_id_fkey
      FOREIGN KEY (remittance_id)
      REFERENCES remittances(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'input_movements_purchase_order_id_fkey'
  ) THEN
    ALTER TABLE input_movements
      ADD CONSTRAINT input_movements_purchase_order_id_fkey
      FOREIGN KEY (purchase_order_id)
      REFERENCES purchase_orders(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'input_movements_invoice_id_fkey'
  ) THEN
    ALTER TABLE input_movements
      ADD CONSTRAINT input_movements_invoice_id_fkey
      FOREIGN KEY (invoice_id)
      REFERENCES expenses(id);
  END IF;
END $$;
