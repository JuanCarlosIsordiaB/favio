-- ============================================
-- Tabla expense_items + columnas faltantes en expenses
-- Ejecutar en Supabase: SQL Editor → New query → Pegar y Run
-- ============================================

-- ========== PARTE 1: Crear tabla expense_items (si no existe) ==========
CREATE TABLE IF NOT EXISTS expense_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    purchase_order_item_id UUID REFERENCES purchase_order_items(id) ON DELETE SET NULL,
    item_description TEXT NOT NULL,
    category VARCHAR(100),
    quantity NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    unit_price NUMERIC(10, 2) DEFAULT 0,
    supplier_item_code VARCHAR(100),
    tax_rate NUMERIC(5, 2) DEFAULT 0,
    subtotal NUMERIC(10, 2) DEFAULT 0,
    tax_amount NUMERIC(10, 2) DEFAULT 0,
    total NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_items_expense_id ON expense_items(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_purchase_order_item_id ON expense_items(purchase_order_item_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_category ON expense_items(category);

-- Habilitar RLS y política básica (Supabase)
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expense_items_select" ON expense_items;
CREATE POLICY "expense_items_select" ON expense_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "expense_items_insert" ON expense_items;
CREATE POLICY "expense_items_insert" ON expense_items FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "expense_items_update" ON expense_items;
CREATE POLICY "expense_items_update" ON expense_items FOR UPDATE USING (true);
DROP POLICY IF EXISTS "expense_items_delete" ON expense_items;
CREATE POLICY "expense_items_delete" ON expense_items FOR DELETE USING (true);

-- ========== PARTE 2: Columnas faltantes en expenses ==========

-- 1. payment_condition (Crédito / Contado) - requerido para facturas desde OC
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS payment_condition VARCHAR(20);

-- 2. invoice_date (por si no existe)
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS invoice_date DATE;

-- 3. invoice_number (por si no existe)
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);

-- 4. invoice_series (por si no existe)
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS invoice_series VARCHAR(50);

-- 5. concept (por si no existe)
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS concept TEXT;

-- 6. description (por si no existe)
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS description TEXT;

-- 7. provider_* (por si no existen - nombres pueden variar según tu schema)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS provider_rut VARCHAR(50);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS provider_phone VARCHAR(50);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS provider_email VARCHAR(255);

-- 8. Asegurar que amount tiene default (evitar NULL)
ALTER TABLE expenses ALTER COLUMN amount SET DEFAULT 0;
UPDATE expenses SET amount = 0 WHERE amount IS NULL;
