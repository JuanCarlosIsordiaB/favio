-- ============================================
-- Columnas faltantes en payment_orders
-- Ejecutar en Supabase: SQL Editor → New query → Pegar y Run
-- ============================================
-- Soluciona: "Could not find the 'expense_id' column..." y "Could not find the 'planned_payment_date' column..."

-- 1. expense_id: vincular orden de pago a una factura (cuando es una sola)
ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS expense_id UUID NULL REFERENCES expenses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payment_orders_expense_id ON payment_orders(expense_id);
COMMENT ON COLUMN payment_orders.expense_id IS 'Factura (expense) asociada cuando la orden es de una sola factura';

-- 2. planned_payment_date: fecha de pago planificada
ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS planned_payment_date DATE;

UPDATE payment_orders
SET planned_payment_date = order_date::date
WHERE planned_payment_date IS NULL AND order_date IS NOT NULL;
