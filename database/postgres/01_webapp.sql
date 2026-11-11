CREATE SCHEMA entrega;
CREATE SCHEMA institutos;
CREATE SCHEMA personas;
CREATE SCHEMA recursos;
CREATE SCHEMA zona;
CREATE TYPE institutos.tipo_organizacion_enum AS ENUM (
    'ONG',
    'empresa',
    'instituto',
    'comunidad'
);
CREATE TYPE personas.estado_persona_enum AS ENUM (
    'desaparecido',
    'encontrado'
);
CREATE TYPE personas.pais_enum AS ENUM (
    'Venezuela',
    'Colombia',
    'Ecuador',
    'Perú',
    'Chile',
    'Argentina',
    'Brasil',
    'México',
    'Panamá',
    'República Dominicana',
    'Estados Unidos',
    'España',
    'Otro'
);
CREATE TYPE recursos.recurso_enum AS ENUM (
    'Agua potable',
    'Alimentos',
    'Ropa',
    'Cobijas/Colchonetas',
    'Higiene personal',
    'primeros auxilios',
    'Herramientas',
    'Bolsas de basura',
    'Otro'
);
CREATE TYPE zona.capacidad_enum AS ENUM (
    'alto',
    'intermedio',
    'pocos',
    'sin insumos'
);
CREATE TYPE zona.prioridad_enum AS ENUM (
    'bajo',
    'medio',
    'alto'
);
CREATE TABLE entrega.entrega (
    id_entrega integer NOT NULL,
    codigo text,
    destino text,
    origen text,
    id_vehiculo integer,
    id_acopio integer NOT NULL,
    id_afectado integer,
    cantidad_objetivo numeric(12,2) NOT NULL,
    id_inventario integer[],
    id_prioridad integer,
    CONSTRAINT entrega_cantidad_objetivo_check CHECK ((cantidad_objetivo >= (0)::numeric))
);
CREATE SEQUENCE entrega.entrega_id_entrega_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE entrega.entrega_id_entrega_seq OWNED BY entrega.entrega.id_entrega;
CREATE TABLE entrega.vehiculo (
    id_vehiculo integer NOT NULL,
    id_conductor text,
    nombre text NOT NULL,
    placa character varying(20) NOT NULL
);
CREATE SEQUENCE entrega.vehiculo_id_vehiculo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE entrega.vehiculo_id_vehiculo_seq OWNED BY entrega.vehiculo.id_vehiculo;
CREATE TABLE institutos.organizacion (
    id integer NOT NULL,
    nombre text NOT NULL,
    tipo institutos.tipo_organizacion_enum NOT NULL,
    rif text NOT NULL
);
CREATE SEQUENCE institutos.organizacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE institutos.organizacion_id_seq OWNED BY institutos.organizacion.id;
CREATE TABLE personas.donador (
    id integer NOT NULL,
    nombre text NOT NULL,
    correo text,
    recurso_donado recursos.recurso_enum[],
    dinero_donado numeric(12,2),
    estado text,
    pais personas.pais_enum,
    id_acopio_donado integer,
    CONSTRAINT donador_dinero_donado_check CHECK ((dinero_donado >= (0)::numeric))
);
CREATE SEQUENCE personas.donador_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE personas.donador_id_seq OWNED BY personas.donador.id;
CREATE TABLE personas.registrados (
    id integer NOT NULL,
    nombre_completo text NOT NULL,
    cedula text NOT NULL,
    foto text,
    estado_persona personas.estado_persona_enum NOT NULL,
    id_zona integer
);
CREATE SEQUENCE personas.registrados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE personas.registrados_id_seq OWNED BY personas.registrados.id;
CREATE TABLE personas.usuario (
    id integer NOT NULL,
    nombre text NOT NULL,
    correo text NOT NULL,
    id_organizacion integer
);
CREATE SEQUENCE personas.usuario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE personas.usuario_id_seq OWNED BY personas.usuario.id;
CREATE TABLE recursos.inventario (
    id_inventario integer NOT NULL,
    tipo recursos.recurso_enum NOT NULL,
    cantidad numeric(12,2) NOT NULL,
    nombre text NOT NULL,
    CONSTRAINT inventario_cantidad_check CHECK ((cantidad >= (0)::numeric))
);
CREATE SEQUENCE recursos.inventario_id_inventario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE recursos.inventario_id_inventario_seq OWNED BY recursos.inventario.id_inventario;
CREATE TABLE zona.acopio (
    id_acopio integer NOT NULL,
    titulo text DEFAULT 'Sin titulo'::text NOT NULL,
    zona text,
    foto text,
    recursos_comunes recursos.recurso_enum[],
    capacidad zona.capacidad_enum,
    enlace_maps character varying NOT NULL,
    id_inventario integer,
    id_responsable integer
);
CREATE SEQUENCE zona.acopio_id_acopio_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE zona.acopio_id_acopio_seq OWNED BY zona.acopio.id_acopio;
CREATE TABLE zona.afectado (
    id integer NOT NULL,
    titulo text DEFAULT 'Sin titulo'::text NOT NULL,
    zona text,
    foto text,
    prioridad zona.prioridad_enum,
    poblacion_riesgo integer,
    enlace_maps character varying NOT NULL,
    id_prioridad integer,
    CONSTRAINT afectado_poblacion_riesgo_check CHECK (((poblacion_riesgo >= 0) AND (poblacion_riesgo <= 100000)))
);
CREATE SEQUENCE zona.afectado_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE zona.afectado_id_seq OWNED BY zona.afectado.id;
CREATE TABLE zona.prioridad (
    id_prioridad integer NOT NULL,
    nivel zona.prioridad_enum NOT NULL
);
CREATE SEQUENCE zona.prioridad_id_prioridad_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE zona.prioridad_id_prioridad_seq OWNED BY zona.prioridad.id_prioridad;
CREATE TABLE zona.voluntario (
    id_voluntario integer NOT NULL,
    nombre_completo text NOT NULL,
    cedula text NOT NULL,
    id_acopio integer
);
CREATE SEQUENCE zona.voluntario_id_voluntario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE zona.voluntario_id_voluntario_seq OWNED BY zona.voluntario.id_voluntario;
ALTER TABLE ONLY entrega.entrega ALTER COLUMN id_entrega SET DEFAULT nextval('entrega.entrega_id_entrega_seq'::regclass);
ALTER TABLE ONLY entrega.vehiculo ALTER COLUMN id_vehiculo SET DEFAULT nextval('entrega.vehiculo_id_vehiculo_seq'::regclass);
ALTER TABLE ONLY institutos.organizacion ALTER COLUMN id SET DEFAULT nextval('institutos.organizacion_id_seq'::regclass);
ALTER TABLE ONLY personas.donador ALTER COLUMN id SET DEFAULT nextval('personas.donador_id_seq'::regclass);
ALTER TABLE ONLY personas.registrados ALTER COLUMN id SET DEFAULT nextval('personas.registrados_id_seq'::regclass);
ALTER TABLE ONLY personas.usuario ALTER COLUMN id SET DEFAULT nextval('personas.usuario_id_seq'::regclass);
ALTER TABLE ONLY recursos.inventario ALTER COLUMN id_inventario SET DEFAULT nextval('recursos.inventario_id_inventario_seq'::regclass);
ALTER TABLE ONLY zona.acopio ALTER COLUMN id_acopio SET DEFAULT nextval('zona.acopio_id_acopio_seq'::regclass);
ALTER TABLE ONLY zona.afectado ALTER COLUMN id SET DEFAULT nextval('zona.afectado_id_seq'::regclass);
ALTER TABLE ONLY zona.prioridad ALTER COLUMN id_prioridad SET DEFAULT nextval('zona.prioridad_id_prioridad_seq'::regclass);
ALTER TABLE ONLY zona.voluntario ALTER COLUMN id_voluntario SET DEFAULT nextval('zona.voluntario_id_voluntario_seq'::regclass);
COPY entrega.entrega (id_entrega, codigo, destino, origen, id_vehiculo, id_acopio, id_afectado, cantidad_objetivo, id_inventario, id_prioridad) FROM stdin;
1	ENT-001	Petare	Acopio Central Petare	1	1	1	200.00	{1,2}	3
2	ENT-002	Catia	Acopio Catia	2	2	2	150.00	{4,5}	2
3	ENT-003	El Valle	Acopio El Valle	3	3	3	100.00	{6}	3
4	ENT-004	La Vega	Acopio La Vega	1	4	4	50.00	{1}	1
\.


COPY entrega.vehiculo (id_vehiculo, id_conductor, nombre, placa) FROM stdin;
1	V-12345678	Camión Ford	A1B2C3
2	V-23456789	Camioneta Toyota	X9Y8Z7
3	V-34567890	Furgón Chevrolet	M4N5O6
\.


COPY institutos.organizacion (id, nombre, tipo, rif) FROM stdin;
1	Cruz Roja Venezuela	ONG	J-12345678-9
2	Empresa Polar	empresa	J-98765432-1
3	Instituto Pedagógico	instituto	J-55555555-5
4	Consejo Comunal Petare	comunidad	J-66666666-6
\.


COPY personas.donador (id, nombre, correo, recurso_donado, dinero_donado, estado, pais, id_acopio_donado) FROM stdin;
1	Juan Donante	juan@mail.com	{"Agua potable",Alimentos}	100.00	activo	Venezuela	1
2	Empresa XYZ	xyz@mail.com	{Ropa}	500.00	activo	Colombia	2
3	María Solidaria	maria@mail.com	{Cobijas/Colchonetas}	0.00	pendiente	Ecuador	3
4	Fundación Ayuda	ayuda@mail.com	\N	1000.00	activo	Panamá	1
5	Pedro Anónimo	\N	{Otro}	25.00	inactivo	Otro	4
\.


COPY personas.registrados (id, nombre_completo, cedula, foto, estado_persona, id_zona) FROM stdin;
\.


COPY personas.usuario (id, nombre, correo, id_organizacion) FROM stdin;
1	Admin Cruz Roja	admin@cruzroja.org	1
2	Contacto Polar	contacto@polar.com	2
3	Coordinador IP	coord@ip.edu	3
4	Vocero Comunal	vocero@petare.org	4
5	Usuario Independiente	indep@correo.com	\N
\.


COPY recursos.inventario (id_inventario, tipo, cantidad, nombre) FROM stdin;
1	Agua potable	500.00	Botellones 5L
2	Alimentos	300.00	Cajas de comida no perecedera
3	Ropa	800.00	Ropa de abrigo
4	Cobijas/Colchonetas	250.00	Cobijas térmicas
5	Higiene personal	400.00	Kits de higiene
6	primeros auxilios	150.00	Botiquines básicos
7	Herramientas	80.00	Palas y picos
8	Bolsas de basura	1000.00	Bolsas resistentes
9	Otro	60.00	Linternas
\.


COPY zona.acopio (id_acopio, titulo, zona, foto, recursos_comunes, capacidad, enlace_maps, id_inventario, id_responsable) FROM stdin;
1	Acopio Central Petare	Petare	\N	{"Agua potable",Alimentos,Ropa}	alto	https://maps.app.goo.gl/acp1	1	1
2	Acopio Catia	Catia	\N	{Cobijas/Colchonetas,"Higiene personal"}	intermedio	https://maps.app.goo.gl/acp2	4	2
3	Acopio El Valle	El Valle	\N	{Alimentos,"primeros auxilios"}	pocos	https://maps.app.goo.gl/acp3	6	3
4	Acopio La Vega	La Vega	\N	{"Agua potable"}	sin insumos	https://maps.app.goo.gl/acp4	1	4
\.


COPY zona.afectado (id, titulo, zona, foto, prioridad, poblacion_riesgo, enlace_maps, id_prioridad) FROM stdin;
1	Derrumbe sector norte	Petare	\N	alto	850	https://maps.app.goo.gl/abc1	3
2	Inundación barrio sur	Catia	\N	medio	320	https://maps.app.goo.gl/abc2	2
3	Deslizamiento cerro	El Valle	\N	alto	1200	https://maps.app.goo.gl/abc3	3
4	Falta de agua	La Vega	\N	bajo	150	https://maps.app.goo.gl/abc4	1
\.


COPY zona.prioridad (id_prioridad, nivel) FROM stdin;
1	bajo
2	medio
3	alto
\.


COPY zona.voluntario (id_voluntario, nombre_completo, cedula, id_acopio) FROM stdin;
1	Ana Pérez	V-12345678	1
2	Luis Gómez	V-23456789	2
3	María Rodríguez	V-34567890	3
4	Carlos Díaz	V-45678901	4
\.


SELECT pg_catalog.setval('entrega.entrega_id_entrega_seq', 4, true);
SELECT pg_catalog.setval('entrega.vehiculo_id_vehiculo_seq', 3, true);
SELECT pg_catalog.setval('institutos.organizacion_id_seq', 4, true);
SELECT pg_catalog.setval('personas.donador_id_seq', 5, true);
SELECT pg_catalog.setval('personas.registrados_id_seq', 1, false);
SELECT pg_catalog.setval('personas.usuario_id_seq', 5, true);
SELECT pg_catalog.setval('recursos.inventario_id_inventario_seq', 9, true);
SELECT pg_catalog.setval('zona.acopio_id_acopio_seq', 4, true);
SELECT pg_catalog.setval('zona.afectado_id_seq', 4, true);
SELECT pg_catalog.setval('zona.prioridad_id_prioridad_seq', 3, true);
SELECT pg_catalog.setval('zona.voluntario_id_voluntario_seq', 4, true);
ALTER TABLE ONLY entrega.entrega
    ADD CONSTRAINT entrega_codigo_key UNIQUE (codigo);
ALTER TABLE ONLY entrega.entrega
    ADD CONSTRAINT entrega_pkey PRIMARY KEY (id_entrega);
ALTER TABLE ONLY entrega.vehiculo
    ADD CONSTRAINT vehiculo_pkey PRIMARY KEY (id_vehiculo);
ALTER TABLE ONLY entrega.vehiculo
    ADD CONSTRAINT vehiculo_placa_key UNIQUE (placa);
ALTER TABLE ONLY institutos.organizacion
    ADD CONSTRAINT organizacion_pkey PRIMARY KEY (id);
ALTER TABLE ONLY institutos.organizacion
    ADD CONSTRAINT organizacion_rif_key UNIQUE (rif);
ALTER TABLE ONLY personas.donador
    ADD CONSTRAINT donador_pkey PRIMARY KEY (id);
ALTER TABLE ONLY personas.registrados
    ADD CONSTRAINT registrados_pkey PRIMARY KEY (id);
ALTER TABLE ONLY personas.usuario
    ADD CONSTRAINT usuario_correo_key UNIQUE (correo);
ALTER TABLE ONLY personas.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id);
ALTER TABLE ONLY recursos.inventario
    ADD CONSTRAINT inventario_pkey PRIMARY KEY (id_inventario);
ALTER TABLE ONLY zona.acopio
    ADD CONSTRAINT acopio_pkey PRIMARY KEY (id_acopio);
ALTER TABLE ONLY zona.afectado
    ADD CONSTRAINT afectado_pkey PRIMARY KEY (id);
ALTER TABLE ONLY zona.prioridad
    ADD CONSTRAINT prioridad_nivel_key UNIQUE (nivel);
ALTER TABLE ONLY zona.prioridad
    ADD CONSTRAINT prioridad_pkey PRIMARY KEY (id_prioridad);
ALTER TABLE ONLY zona.voluntario
    ADD CONSTRAINT voluntario_cedula_key UNIQUE (cedula);
ALTER TABLE ONLY zona.voluntario
    ADD CONSTRAINT voluntario_pkey PRIMARY KEY (id_voluntario);
CREATE INDEX idx_entrega_acopio ON entrega.entrega USING btree (id_acopio);
CREATE INDEX idx_entrega_afectado ON entrega.entrega USING btree (id_afectado);
CREATE INDEX idx_entrega_prioridad ON entrega.entrega USING btree (id_prioridad);
CREATE INDEX idx_entrega_vehiculo ON entrega.entrega USING btree (id_vehiculo);
CREATE INDEX idx_organizacion_tipo ON institutos.organizacion USING btree (tipo);
CREATE INDEX idx_donador_acopio ON personas.donador USING btree (id_acopio_donado);
CREATE INDEX idx_donador_pais ON personas.donador USING btree (pais);
CREATE INDEX idx_registrados_cedula ON personas.registrados USING btree (cedula);
CREATE INDEX idx_registrados_estado ON personas.registrados USING btree (estado_persona);
CREATE INDEX idx_registrados_zona ON personas.registrados USING btree (id_zona);
CREATE INDEX idx_usuario_organizacion ON personas.usuario USING btree (id_organizacion);
CREATE INDEX idx_acopio_inventario ON zona.acopio USING btree (id_inventario);
CREATE INDEX idx_acopio_responsable ON zona.acopio USING btree (id_responsable);
CREATE INDEX idx_afectado_prioridad ON zona.afectado USING btree (id_prioridad);
CREATE INDEX idx_voluntario_acopio ON zona.voluntario USING btree (id_acopio);
ALTER TABLE ONLY entrega.entrega
    ADD CONSTRAINT entrega_id_acopio_fkey FOREIGN KEY (id_acopio) REFERENCES zona.acopio(id_acopio);
ALTER TABLE ONLY entrega.entrega
    ADD CONSTRAINT entrega_id_afectado_fkey FOREIGN KEY (id_afectado) REFERENCES zona.afectado(id);
ALTER TABLE ONLY entrega.entrega
    ADD CONSTRAINT entrega_id_prioridad_fkey FOREIGN KEY (id_prioridad) REFERENCES zona.prioridad(id_prioridad);
ALTER TABLE ONLY entrega.entrega
    ADD CONSTRAINT entrega_id_vehiculo_fkey FOREIGN KEY (id_vehiculo) REFERENCES entrega.vehiculo(id_vehiculo);
ALTER TABLE ONLY personas.donador
    ADD CONSTRAINT donador_id_acopio_donado_fkey FOREIGN KEY (id_acopio_donado) REFERENCES zona.acopio(id_acopio) ON DELETE SET NULL;
ALTER TABLE ONLY personas.registrados
    ADD CONSTRAINT registrados_id_zona_fkey FOREIGN KEY (id_zona) REFERENCES zona.afectado(id) ON DELETE SET NULL;
ALTER TABLE ONLY personas.usuario
    ADD CONSTRAINT usuario_id_organizacion_fkey FOREIGN KEY (id_organizacion) REFERENCES institutos.organizacion(id) ON DELETE SET NULL;
ALTER TABLE ONLY zona.acopio
    ADD CONSTRAINT acopio_id_inventario_fkey FOREIGN KEY (id_inventario) REFERENCES recursos.inventario(id_inventario);
ALTER TABLE ONLY zona.acopio
    ADD CONSTRAINT acopio_id_responsable_fkey FOREIGN KEY (id_responsable) REFERENCES zona.voluntario(id_voluntario);
ALTER TABLE ONLY zona.afectado
    ADD CONSTRAINT afectado_id_prioridad_fkey FOREIGN KEY (id_prioridad) REFERENCES zona.prioridad(id_prioridad);
ALTER TABLE ONLY zona.voluntario
    ADD CONSTRAINT fk_voluntario_acopio FOREIGN KEY (id_acopio) REFERENCES zona.acopio(id_acopio) ON DELETE SET NULL;
