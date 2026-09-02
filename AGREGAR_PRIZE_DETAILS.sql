-- Agregar columna para detalles personalizables del premio
-- Ejecuta esto en Supabase: SQL Editor

ALTER TABLE public.raffles ADD COLUMN IF NOT EXISTS prize_details text;

-- Nota: prize_details puede contener múltiples líneas separadas por saltos de línea
-- Ejemplo:
-- Entrega inmediata en Santo Domingo con documentación legal completa.
-- Gastos de traspaso, impuestos o placas cubiertos por la organización.
-- Garantía oficial y factura original a nombre del ganador.
