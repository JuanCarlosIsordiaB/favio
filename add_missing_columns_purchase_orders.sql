-- ============================================
-- AGREGAR COLUMNAS FALTANTES A PURCHASE ORDERS
-- ============================================
-- Este script agrega las columnas que faltan:
-- 1. premise_id en purchase_orders
-- 2. category en purchase_order_items
--
-- INSTRUCCIONES:
-- 1. Ejecuta este script completo en Supabase SQL Editor
-- 2. Verifica que ambas columnas se hayan creado correctamente
--
-- ============================================

-- ============================================
-- PARTE 1: AGREGAR premise_id A purchase_orders
-- ============================================

-- Verificar si la columna ya existe
SELECT 
    'Verificando premise_id en purchase_orders...' AS paso,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_orders' 
AND column_name = 'premise_id';

-- Agregar la columna premise_id si no existe
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS premise_id UUID REFERENCES premises(id) ON DELETE SET NULL;

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_purchase_orders_premise_id 
ON purchase_orders(premise_id);

-- Verificar que se creó correctamente
SELECT 
    'premise_id agregado correctamente' AS resultado,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_orders' 
AND column_name = 'premise_id';

-- ============================================
-- PARTE 2: AGREGAR category A purchase_order_items
-- ============================================

-- Verificar si la columna ya existe
SELECT 
    'Verificando category en purchase_order_items...' AS paso,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_order_items' 
AND column_name = 'category';

-- Agregar la columna category si no existe
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_category 
ON purchase_order_items(category);

-- Verificar que se creó correctamente
SELECT 
    'category agregado correctamente' AS resultado,
    column_name,
    data_type,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'purchase_order_items' 
AND column_name = 'category';

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
-- Verificar que ambas columnas existen
SELECT 
    'VERIFICACIÓN FINAL' AS tipo,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE (table_name = 'purchase_orders' AND column_name = 'premise_id')
   OR (table_name = 'purchase_order_items' AND column_name = 'category')
ORDER BY table_name, column_name;

-- ============================================
-- NOTA
-- ============================================
-- Después de ejecutar este script, deberías poder:
-- 1. Crear nuevas órdenes de compra con premise_id
-- 2. Agregar items con category
-- 3. El error "Could not find the 'premise_id' column" debería desaparecer

