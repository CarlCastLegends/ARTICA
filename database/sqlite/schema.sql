-- ARTICA · esquema SQLite (se crea solo la primera vez que arranca el servidor).
-- Equivale a la base PostgreSQL «webapp» original más las columnas que usa la aplicación.
-- Los "enums" de PostgreSQL son CHECK; los arreglos se guardan como JSON.
PRAGMA foreign_keys = OFF;

CREATE TABLE prioridad (
  id_prioridad INTEGER PRIMARY KEY AUTOINCREMENT,
  nivel TEXT NOT NULL UNIQUE CHECK (nivel IN ('bajo','medio','alto'))
);
CREATE TABLE inventario (
  id_inventario INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK (tipo IN ('Agua potable','Alimentos','Ropa','Cobijas/Colchonetas','Higiene personal','primeros auxilios','Herramientas','Bolsas de basura','Otro')),
  cantidad REAL NOT NULL CHECK (cantidad >= 0),
  nombre TEXT NOT NULL
);
CREATE TABLE organizacion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('ONG','empresa','instituto','comunidad')),
  rif TEXT NOT NULL UNIQUE
);
CREATE TABLE usuario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL UNIQUE,
  id_organizacion INTEGER REFERENCES organizacion(id) ON DELETE SET NULL
);
CREATE TABLE voluntario (
  id_voluntario INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_completo TEXT NOT NULL,
  cedula TEXT NOT NULL UNIQUE,
  id_acopio INTEGER REFERENCES acopio(id_acopio) ON DELETE SET NULL
);
CREATE TABLE acopio (
  id_acopio INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL DEFAULT 'Sin titulo',
  zona TEXT,
  foto TEXT DEFAULT 'https://placehold.co/600x400/e5e7eb/6b7280?text=Zona+de+acopio',
  recursos_comunes TEXT NOT NULL DEFAULT '[]',
  capacidad TEXT CHECK (capacidad IN ('alto','intermedio','pocos','sin insumos')),
  enlace_maps TEXT NOT NULL,
  id_inventario INTEGER REFERENCES inventario(id_inventario),
  id_responsable INTEGER REFERENCES voluntario(id_voluntario),
  lat REAL,
  lng REAL
);
CREATE TABLE afectado (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL DEFAULT 'Sin titulo',
  zona TEXT,
  foto TEXT DEFAULT 'https://placehold.co/600x400/e5e7eb/6b7280?text=Zona+afectada',
  prioridad TEXT CHECK (prioridad IN ('bajo','medio','alto')),
  poblacion_riesgo INTEGER CHECK (poblacion_riesgo >= 0 AND poblacion_riesgo <= 100000),
  enlace_maps TEXT NOT NULL,
  id_prioridad INTEGER REFERENCES prioridad(id_prioridad),
  tipo_desastre TEXT,
  magnitud TEXT,
  fecha_reporte TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  lat REAL,
  lng REAL
);
CREATE TABLE registrados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_completo TEXT NOT NULL,
  cedula TEXT NOT NULL,
  foto TEXT DEFAULT 'https://placehold.co/400x400/e5e7eb/6b7280?text=Sin+foto',
  estado_persona TEXT NOT NULL CHECK (estado_persona IN ('desaparecido','encontrado')),
  id_zona INTEGER REFERENCES afectado(id) ON DELETE SET NULL,
  edad INTEGER CHECK (edad IS NULL OR (edad >= 0 AND edad <= 120)),
  fecha_reporte TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE donador (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  correo TEXT,
  recurso_donado TEXT,
  dinero_donado REAL CHECK (dinero_donado >= 0),
  estado TEXT,
  pais TEXT CHECK (pais IN ('Venezuela','Colombia','Ecuador','Perú','Chile','Argentina','Brasil','México','Panamá','República Dominicana','Estados Unidos','España','Otro')),
  id_acopio_donado INTEGER REFERENCES acopio(id_acopio) ON DELETE SET NULL
);
CREATE TABLE vehiculo (
  id_vehiculo INTEGER PRIMARY KEY AUTOINCREMENT,
  id_conductor TEXT,
  nombre TEXT NOT NULL,
  placa TEXT NOT NULL UNIQUE
);
CREATE TABLE entrega (
  id_entrega INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE,
  destino TEXT,
  origen TEXT,
  id_vehiculo INTEGER REFERENCES vehiculo(id_vehiculo),
  id_acopio INTEGER NOT NULL REFERENCES acopio(id_acopio),
  id_afectado INTEGER REFERENCES afectado(id),
  cantidad_objetivo REAL NOT NULL CHECK (cantidad_objetivo >= 0),
  id_inventario TEXT NOT NULL DEFAULT '[]',
  id_prioridad INTEGER REFERENCES prioridad(id_prioridad),
  estado TEXT NOT NULL DEFAULT 'Preparando' CHECK (estado IN ('Preparando','En tránsito','Entregado')),
  fecha_salida TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  fecha_llegada TEXT
);
CREATE INDEX idx_entrega_estado ON entrega(estado);
CREATE INDEX idx_registrados_estado ON registrados(estado_persona);
CREATE INDEX idx_afectado_fecha ON afectado(fecha_reporte);

-- Datos originales
INSERT INTO prioridad (id_prioridad, nivel) VALUES (1, 'bajo');
INSERT INTO prioridad (id_prioridad, nivel) VALUES (2, 'medio');
INSERT INTO prioridad (id_prioridad, nivel) VALUES (3, 'alto');
INSERT INTO inventario (id_inventario, tipo, cantidad, nombre) VALUES (1, 'Agua potable', 500.00, 'Botellones 5L');
INSERT INTO inventario (id_inventario, tipo, cantidad, nombre) VALUES (2, 'Alimentos', 300.00, 'Cajas de comida no perecedera');
INSERT INTO inventario (id_inventario, tipo, cantidad, nombre) VALUES (3, 'Ropa', 800.00, 'Ropa de abrigo');
INSERT INTO inventario (id_inventario, tipo, cantidad, nombre) VALUES (4, 'Cobijas/Colchonetas', 250.00, 'Cobijas térmicas');
INSERT INTO inventario (id_inventario, tipo, cantidad, nombre) VALUES (5, 'Higiene personal', 400.00, 'Kits de higiene');
INSERT INTO inventario (id_inventario, tipo, cantidad, nombre) VALUES (6, 'primeros auxilios', 150.00, 'Botiquines básicos');
INSERT INTO inventario (id_inventario, tipo, cantidad, nombre) VALUES (7, 'Herramientas', 80.00, 'Palas y picos');
INSERT INTO inventario (id_inventario, tipo, cantidad, nombre) VALUES (8, 'Bolsas de basura', 1000.00, 'Bolsas resistentes');
INSERT INTO inventario (id_inventario, tipo, cantidad, nombre) VALUES (9, 'Otro', 60.00, 'Linternas');
INSERT INTO organizacion (id, nombre, tipo, rif) VALUES (1, 'Cruz Roja Venezuela', 'ONG', 'J-12345678-9');
INSERT INTO organizacion (id, nombre, tipo, rif) VALUES (2, 'Empresa Polar', 'empresa', 'J-98765432-1');
INSERT INTO organizacion (id, nombre, tipo, rif) VALUES (3, 'Instituto Pedagógico', 'instituto', 'J-55555555-5');
INSERT INTO organizacion (id, nombre, tipo, rif) VALUES (4, 'Consejo Comunal Petare', 'comunidad', 'J-66666666-6');
INSERT INTO usuario (id, nombre, correo, id_organizacion) VALUES (1, 'Admin Cruz Roja', 'admin@cruzroja.org', 1);
INSERT INTO usuario (id, nombre, correo, id_organizacion) VALUES (2, 'Contacto Polar', 'contacto@polar.com', 2);
INSERT INTO usuario (id, nombre, correo, id_organizacion) VALUES (3, 'Coordinador IP', 'coord@ip.edu', 3);
INSERT INTO usuario (id, nombre, correo, id_organizacion) VALUES (4, 'Vocero Comunal', 'vocero@petare.org', 4);
INSERT INTO usuario (id, nombre, correo, id_organizacion) VALUES (5, 'Usuario Independiente', 'indep@correo.com', NULL);
INSERT INTO voluntario (id_voluntario, nombre_completo, cedula, id_acopio) VALUES (1, 'Ana Pérez', 'V-12345678', 1);
INSERT INTO voluntario (id_voluntario, nombre_completo, cedula, id_acopio) VALUES (2, 'Luis Gómez', 'V-23456789', 2);
INSERT INTO voluntario (id_voluntario, nombre_completo, cedula, id_acopio) VALUES (3, 'María Rodríguez', 'V-34567890', 3);
INSERT INTO voluntario (id_voluntario, nombre_completo, cedula, id_acopio) VALUES (4, 'Carlos Díaz', 'V-45678901', 4);
INSERT INTO acopio (id_acopio, titulo, zona, recursos_comunes, capacidad, enlace_maps, id_inventario, id_responsable) VALUES (1, 'Acopio Central Petare', 'Petare', '["Agua potable", "Alimentos", "Ropa"]', 'alto', 'https://maps.app.goo.gl/acp1', 1, 1);
INSERT INTO acopio (id_acopio, titulo, zona, recursos_comunes, capacidad, enlace_maps, id_inventario, id_responsable) VALUES (2, 'Acopio Catia', 'Catia', '["Cobijas/Colchonetas", "Higiene personal"]', 'intermedio', 'https://maps.app.goo.gl/acp2', 4, 2);
INSERT INTO acopio (id_acopio, titulo, zona, recursos_comunes, capacidad, enlace_maps, id_inventario, id_responsable) VALUES (3, 'Acopio El Valle', 'El Valle', '["Alimentos", "primeros auxilios"]', 'pocos', 'https://maps.app.goo.gl/acp3', 6, 3);
INSERT INTO acopio (id_acopio, titulo, zona, recursos_comunes, capacidad, enlace_maps, id_inventario, id_responsable) VALUES (4, 'Acopio La Vega', 'La Vega', '["Agua potable"]', 'sin insumos', 'https://maps.app.goo.gl/acp4', 1, 4);
INSERT INTO afectado (id, titulo, zona, prioridad, poblacion_riesgo, enlace_maps, id_prioridad) VALUES (1, 'Derrumbe sector norte', 'Petare', 'alto', 850, 'https://maps.app.goo.gl/abc1', 3);
INSERT INTO afectado (id, titulo, zona, prioridad, poblacion_riesgo, enlace_maps, id_prioridad) VALUES (2, 'Inundación barrio sur', 'Catia', 'medio', 320, 'https://maps.app.goo.gl/abc2', 2);
INSERT INTO afectado (id, titulo, zona, prioridad, poblacion_riesgo, enlace_maps, id_prioridad) VALUES (3, 'Deslizamiento cerro', 'El Valle', 'alto', 1200, 'https://maps.app.goo.gl/abc3', 3);
INSERT INTO afectado (id, titulo, zona, prioridad, poblacion_riesgo, enlace_maps, id_prioridad) VALUES (4, 'Falta de agua', 'La Vega', 'bajo', 150, 'https://maps.app.goo.gl/abc4', 1);
INSERT INTO vehiculo (id_vehiculo, id_conductor, nombre, placa) VALUES (1, 'V-12345678', 'Camión Ford', 'A1B2C3');
INSERT INTO vehiculo (id_vehiculo, id_conductor, nombre, placa) VALUES (2, 'V-23456789', 'Camioneta Toyota', 'X9Y8Z7');
INSERT INTO vehiculo (id_vehiculo, id_conductor, nombre, placa) VALUES (3, 'V-34567890', 'Furgón Chevrolet', 'M4N5O6');
INSERT INTO entrega (id_entrega, codigo, destino, origen, id_vehiculo, id_acopio, id_afectado, cantidad_objetivo, id_inventario, id_prioridad) VALUES (1, 'ENT-001', 'Petare', 'Acopio Central Petare', 1, 1, 1, 200.00, '[1, 2]', 3);
INSERT INTO entrega (id_entrega, codigo, destino, origen, id_vehiculo, id_acopio, id_afectado, cantidad_objetivo, id_inventario, id_prioridad) VALUES (2, 'ENT-002', 'Catia', 'Acopio Catia', 2, 2, 2, 150.00, '[4, 5]', 2);
INSERT INTO entrega (id_entrega, codigo, destino, origen, id_vehiculo, id_acopio, id_afectado, cantidad_objetivo, id_inventario, id_prioridad) VALUES (3, 'ENT-003', 'El Valle', 'Acopio El Valle', 3, 3, 3, 100.00, '[6]', 3);
INSERT INTO entrega (id_entrega, codigo, destino, origen, id_vehiculo, id_acopio, id_afectado, cantidad_objetivo, id_inventario, id_prioridad) VALUES (4, 'ENT-004', 'La Vega', 'Acopio La Vega', 1, 4, 4, 50.00, '[1]', 1);
INSERT INTO donador (id, nombre, correo, recurso_donado, dinero_donado, estado, pais, id_acopio_donado) VALUES (1, 'Juan Donante', 'juan@mail.com', '["Agua potable", "Alimentos"]', 100.00, 'activo', 'Venezuela', 1);
INSERT INTO donador (id, nombre, correo, recurso_donado, dinero_donado, estado, pais, id_acopio_donado) VALUES (2, 'Empresa XYZ', 'xyz@mail.com', '["Ropa"]', 500.00, 'activo', 'Colombia', 2);
INSERT INTO donador (id, nombre, correo, recurso_donado, dinero_donado, estado, pais, id_acopio_donado) VALUES (3, 'María Solidaria', 'maria@mail.com', '["Cobijas/Colchonetas"]', 0.00, 'pendiente', 'Ecuador', 3);
INSERT INTO donador (id, nombre, correo, recurso_donado, dinero_donado, estado, pais, id_acopio_donado) VALUES (4, 'Fundación Ayuda', 'ayuda@mail.com', NULL, 1000.00, 'activo', 'Panamá', 1);
INSERT INTO donador (id, nombre, correo, recurso_donado, dinero_donado, estado, pais, id_acopio_donado) VALUES (5, 'Pedro Anónimo', NULL, '["Otro"]', 25.00, 'inactivo', 'Otro', 4);
