-- ============================================
-- ANÁLISIS DE ESTRUCTURA DE FACTURAS (expenses)
-- ============================================
-- Este script analiza qué campos existen y cuáles faltan
-- según los requerimientos del SECTOR 2 - FACTURA
--
-- ============================================

-- Verificar estructura actual de expenses
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'expenses'
ORDER BY ordinal_position;

-- Verificar si existe tabla expense_items
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'expense_items'
ORDER BY ordinal_position;

-- Verificar estados actuales en expenses
SELECT 
    status,
    COUNT(*) as cantidad
FROM expenses
GROUP BY status
ORDER BY status;

-- Verificar foreign keys relacionadas con purchase_orders
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'expenses'
  AND (kcu.column_name = 'purchase_order_id' OR ccu.table_name = 'purchase_orders');

-- Verificar si existe campo para código de ítem del proveedor
SELECT 
    column_name
FROM information_schema.columns
WHERE table_name = 'expenses'
AND (column_name LIKE '%item%code%' 
     OR column_name LIKE '%supplier%code%'
     OR column_name LIKE '%provider%code%'
     OR column_name LIKE '%codigo%');

-- Verificar campos de fecha de factura
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'expenses'
AND (column_name LIKE '%date%' OR column_name LIKE '%fecha%');

