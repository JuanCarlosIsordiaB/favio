-- ============================================
-- AGREGAR COLUMNA premise_id A purchase_orders
-- ============================================
-- Este script agrega la columna premise_id que falta en la tabla purchase_orders
--
-- INSTRUCCIONES:
-- 1. Ejecuta este script en Supabase SQL Editor
-- 2. Verifica que la columna se haya creado correctamente
--
-- ============================================

-- PASO 1: Verificar si la columna ya existe
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_orders' 
AND column_name = 'premise_id';

-- PASO 2: Agregar la columna premise_id si no existe
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS premise_id UUID REFERENCES premises(id) ON DELETE SET NULL;

-- PASO 3: Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_purchase_orders_premise_id 
ON purchase_orders(premise_id);

-- PASO 4: Verificar que la columna se creó correctamente
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'purchase_orders' 
AND column_name = 'premise_id';

-- PASO 5: Verificar que el índice se creó
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'purchase_orders'
AND indexname = 'idx_purchase_orders_premise_id';

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
-- La columna premise_id ahora debería existir y estar lista para usar
-- Puedes verificar ejecutando:
-- SELECT premise_id FROM purchase_orders LIMIT 1;

