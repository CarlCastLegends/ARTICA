-- ARTICA · extensiones ADITIVAS sobre la base `webapp` (no borran ni renombran nada).
-- Se ejecutan DESPUÉS de 01_webapp.sql. Son idempotentes (se pueden repetir).

-- Zonas afectadas: tipo de desastre, magnitud, fecha y coordenadas para el mapa.
ALTER TABLE zona.afectado
  ADD COLUMN IF NOT EXISTS tipo_desastre text,
  ADD COLUMN IF NOT EXISTS magnitud      text,
  ADD COLUMN IF NOT EXISTS fecha_reporte timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS lat           double precision,
  ADD COLUMN IF NOT EXISTS lng           double precision;

-- Zonas de acopio: coordenadas para el mapa.
ALTER TABLE zona.acopio
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

-- Registrados: edad y fecha del reporte.
ALTER TABLE personas.registrados
  ADD COLUMN IF NOT EXISTS edad          integer,
  ADD COLUMN IF NOT EXISTS fecha_reporte timestamptz NOT NULL DEFAULT now();
DO $$ BEGIN
  ALTER TABLE personas.registrados
    ADD CONSTRAINT registrados_edad_check CHECK (edad IS NULL OR (edad >= 0 AND edad <= 120));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Entregas: estado y fechas del despacho.
ALTER TABLE entrega.entrega
  ADD COLUMN IF NOT EXISTS estado        text NOT NULL DEFAULT 'Preparando',
  ADD COLUMN IF NOT EXISTS fecha_salida  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS fecha_llegada timestamptz;
DO $$ BEGIN
  ALTER TABLE entrega.entrega
    ADD CONSTRAINT entrega_estado_check CHECK (estado IN ('Preparando','En tránsito','Entregado'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fotos por defecto (enlaces con fondo gris). Las fotos subidas se guardan en
-- /img/reg (registrados), /img/afe (afectado) y /img/aco (acopio).
ALTER TABLE personas.registrados ALTER COLUMN foto SET DEFAULT 'https://placehold.co/400x400/e5e7eb/6b7280?text=Sin+foto';
ALTER TABLE zona.afectado        ALTER COLUMN foto SET DEFAULT 'https://placehold.co/600x400/e5e7eb/6b7280?text=Zona+afectada';
ALTER TABLE zona.acopio          ALTER COLUMN foto SET DEFAULT 'https://placehold.co/600x400/e5e7eb/6b7280?text=Zona+de+acopio';
UPDATE personas.registrados SET foto = 'https://placehold.co/400x400/e5e7eb/6b7280?text=Sin+foto'        WHERE foto IS NULL;
UPDATE zona.afectado        SET foto = 'https://placehold.co/600x400/e5e7eb/6b7280?text=Zona+afectada'   WHERE foto IS NULL;
UPDATE zona.acopio          SET foto = 'https://placehold.co/600x400/e5e7eb/6b7280?text=Zona+de+acopio'  WHERE foto IS NULL;
