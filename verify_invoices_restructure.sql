-- ============================================
-- VERIFICACIÓN COMPLETA DE REESTRUCTURACIÓN
-- ============================================
-- Este script verifica que todos los cambios se aplicaron correctamente
--
-- ============================================

-- 1. Verificar que expense_items existe
SELECT 
    'expense_items' AS tabla,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'expense_items'
ORDER BY ordinal_position;

-- 2. Verificar campos agregados a expenses
SELECT 
    'expenses - campos nuevos' AS tabla,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'expenses'
AND column_name IN ('supplier_item_code', 'invoice_date', 'payment_condition')
ORDER BY column_name;

-- 3. Verificar constraint de estados
SELECT 
    'Constraint de estados' AS tipo,
    conname,
    pg_get_constraintdef(oid) as definicion
FROM pg_constraint
WHERE conrelid = 'expenses'::regclass
AND conname = 'check_expense_status';

-- 4. Verificar función create_invoice_from_purchase_order
SELECT 
    'Función create_invoice_from_purchase_order' AS tipo,
    proname,
    pg_get_functiondef(oid) as definicion
FROM pg_proc
WHERE proname = 'create_invoice_from_purchase_order';

-- 5. Verificar trigger sync_invoice_on_po_change
SELECT 
    'Trigger sync_invoice_on_po_change' AS tipo,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_sync_invoice_on_po_change';

-- 6. Verificar índices de expense_items
SELECT 
    'Índices expense_items' AS tipo,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'expense_items'
ORDER BY indexname;

-- 7. Verificar estados actuales en expenses
SELECT 
    'Estados actuales' AS tipo,
    status,
    COUNT(*) as cantidad
FROM expenses
GROUP BY status
ORDER BY status;

-- 8. Verificar foreign keys de expense_items
SELECT
    'Foreign Keys expense_items' AS tipo,
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
  AND tc.table_name = 'expense_items'
ORDER BY kcu.column_name;

