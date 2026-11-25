# AGENTS.md — Guía para agente GORuta

## 1. Qué es este proyecto

**GORuta** es un portal web comercial (PWA) y motor de búsqueda turística para una agencia de viajes PyME. Es el proyecto final de *Desarrollo Basado en Modelos* (BUAP, FCC) y se construye con un enfoque **MDE/MDD/MDA**: del modelo de negocio (CIM) al metamodelo y DSL (PIM), a los modelos de plataforma (PSM) y de ahí al código mediante transformaciones M2M y M2T.

Qué hace el sistema:

- **Front-Office (público):** busca vuelos y hoteles, muestra detalle de itinerario y equipaje, hace checkout con pasajeros y pasaportes, genera un comprobante PDF y lo envía por correo, y muestra un carrusel de paquetes locales.
- **Integración y caché:** consume un proveedor turístico con OAuth2, normaliza las ofertas, guarda búsquedas en caché por firma con TTL, aplica el markup y revalida la tarifa antes de confirmar.
- **Back-Office (admin):** configura markups, administra paquetes y promociones (CRUD), consulta reservas y clientes.

## 2. Regla de oro: el modelo manda

1. **Nunca edites a mano nada dentro de `generado/`.** Se sobrescribe al regenerar. Si necesitas cambiarlo, cambia el modelo, la plantilla o la transformación que lo produce.
2. **Los cambios de dominio empiezan en el modelo** (`modelos/pim/`), no en el código. Orden correcto: metamodelo / OCL / DSL, luego transformaciones, luego `npm run generar`, luego código manual.
3. **Código manual solo en `manual/`.** Puede extender lo generado, pero no modificarlo. La única excepción son las regiones protegidas marcadas con `// <user-code>` ... `// </user-code>`, que se conservan al regenerar.
4. Todo archivo generado empieza con `// @generated`. Si ves ese encabezado, no lo edites.

## 3. Estructura del repositorio

```
goruta/
  docs/                  Documentación técnica en LaTeX (main.tex, figuras/)
  modelos/
    pim/                 goruta.ecore (metamodelo), restricciones.ocl
    dsl/                 politica.goruta, paquetes.goruta, vistas.goruta
    psm/                 datos.psm, web.psm        (generados por M2M)
  transformaciones/
    pim2psm_datos.atl
    pim2psm_web.atl
    plantillas/          entidad.mtl, validador.mtl, crud_ui.mtl, router.mtl, ddl.mtl
  generado/              NO EDITAR A MANO
    db/                  schema.sql
    backend/             entidades/, validadores/, rutas/
    frontend/            admin/
  manual/
    backend/             servicios/, integraciones/, pdf/, seguridad/, repositorios/
    frontend/            publico/ (PWA, service worker, manifiesto)
  pruebas/               unitarias/, integracion/, sistema/
  AGENTS.md
```

Si la estructura real del repositorio difiere, actualiza esta sección en el mismo cambio.

## 4. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Cliente | HTML5, CSS3, JavaScript; PWA (manifiesto + service worker); diseño responsivo *mobile first* |
| API | Node.js con Express, rutas bajo `/api/v1` |
| Base de datos | PostgreSQL (tipos ENUM, `TEXT[]`, `JSONB`, `TIMESTAMPTZ`) |
| Caché de búsquedas | Tabla `entrada_cache` (opcional: Redis) |
| PDF y correo | PDFKit y Nodemailer (SMTP) |
| Modelado | Eclipse EMF/Ecore, OCL, Xtext (DSL), ATL (M2M), Acceleo (M2T) |
| Diagramas | Mermaid |
| Documentación | LaTeX (`docs/`) |

## 5. Comandos

> Convención propuesta. Ajusta los nombres a los scripts reales de `package.json`.

```bash
npm install            # dependencias
npm run generar        # cadena completa: DSL/PIM -> PSM -> código (regenera generado/)
npm run db:migrar      # aplica schema.sql / migraciones en la base de desarrollo
npm run dev            # servidor de desarrollo (usa el proveedor simulado por defecto)
npm test               # pruebas unitarias y de integración
npm run lint           # estilo y análisis estático
```

Antes de dar una tarea por terminada, ejecuta como mínimo: `npm run generar` (si tocaste modelos), `npm run lint` y `npm test`.

## 6. Reglas de negocio que no debes romper

Fuente de verdad: Capítulo 3 de la documentación (RN-01 a RN-06) y Capítulo 4 (invariantes OCL INV-01 a INV-08).

- **Markup porcentual (RN-01):** `Pf = Pb * (1 + m/100)`, con `0 <= m <= markupMaximo` (50 % por omisión).
- **Markup fijo (RN-02):** vuelos `Pf = Pb + k * pasajeros`; hoteles `Pf = Pb + k * habitaciones * noches`.
- **Redondeo (RN-03):** hacia arriba al múltiplo `r`: `Pfinal = ceil(Pf / r) * r` y siempre `Pfinal >= Pb`. Sin regla vigente se aplica el markup predeterminado y se registra la incidencia. No puede haber dos reglas activas del mismo producto con vigencias traslapadas (INV-03).
- **TTL de caché (RN-04):** según días `d` al viaje: `d <= 3` → 10 min; `3 < d <= 30` → 30 min; `d > 30` → 120 min (configurables por agencia). Al cambiar un markup se invalidan las entradas afectadas.
- **Validaciones de reserva (RN-05):** al menos 1 adulto, máximo 9 pasajeros, infantes <= adultos, tipo de pasajero coherente con la edad (adulto >= 12, niño 2–11, infante < 2), pasaporte vigente 6 meses después del regreso en vuelos internacionales, correo válido y aceptación de aviso de privacidad y términos.
- **Revalidación (RN-06):** antes de confirmar se revalida con el proveedor. Mismo precio: continúa. Menor: se informa y se confirma al nuevo precio. Mayor: se requiere aceptación explícita (respuesta 409). No disponible: se cancela el flujo. **El precio de una reserva confirmada es inmutable** (se guardan precio base, markup y total).
- El cliente **nunca** ve el markup como concepto separado; el Back-Office sí.

## 7. Integración con el proveedor turístico

- Todo acceso al proveedor pasa por la interfaz `ProveedorTuristico` (`buscarVuelos`, `buscarHoteles`, `revalidar`). **No llames a la API de Amadeus (ni a ninguna otra) desde servicios, controladores o el cliente.**
- Hay dos implementaciones: `AmadeusAdapter` y `ProveedorSimulado`. En desarrollo y pruebas se usa el simulado; las respuestas de ambos deben tener la misma estructura normalizada.
- Autenticación OAuth2 con flujo *client credentials* en `TokenManager`: el token se guarda en memoria, se reutiliza mientras sea válido y se renueva antes de expirar; ante un 401 se renueva y se reintenta **una sola vez**.
- Nota de vigencia: el portal Self-Service de Amadeus (capa gratuita) fue anunciado para cierre en julio de 2026. Por eso existe el proveedor simulado y el aislamiento por interfaz. Antes de apoyarte en un endpoint real, verifica su contrato vigente.
- Los endpoints del proveedor y sus detalles viven **solo** en el adaptador.

## 8. Seguridad y datos personales

- **Nunca** pongas credenciales, secretos ni tokens en el código, en pruebas, en logs ni en commits. Usa variables de entorno (`.env` ignorado por git; mantén `.env.example` sin valores reales).
- Los números de pasaporte se guardan cifrados (`numero_pasaporte_cif`, `BYTEA`). No los imprimas en logs ni los devuelvas completos en respuestas administrativas salvo que el rol lo permita.
- Todo el tráfico va por HTTPS. Las consultas SQL siempre parametrizadas; nada de concatenar entradas del usuario.
- Los endpoints `/api/v1/admin/*` exigen sesión y rol. Las consultas a reservas y clientes se registran en `bitacora_acceso`.
- Mensajes de error genéricos para autenticación (no revelar si el correo existe).

## 9. Convenciones de código

- **Idioma:** identificadores de dominio y textos de interfaz en **español** (`PaqueteLocal`, `precioFinal`); términos técnicos estándar en inglés (`router`, `middleware`). Comentarios y commits en español.
- **Nombres:** JavaScript en `camelCase` (clases en `PascalCase`); SQL en `snake_case` (tablas en singular: `reserva`, `paquete_local`); rutas REST en plural y minúsculas bajo `/api/v1`.
- **Dinero:** `NUMERIC(12,2)` en BD; nunca uses `float` para sumar o redondear precios (usa enteros en centavos o una librería decimal).
- **Fechas:** `TIMESTAMPTZ` / ISO 8601; las reglas de vigencia usan `DATE`.
- **Errores API:** códigos estándar (400, 401, 403, 404, 409, 429, 502) y cuerpo `{ "mensaje": "...", "errores": [...] }`.
- **Responsividad:** *mobile first*; puntos de quiebre en 640 px y 1024 px; la interfaz debe funcionar desde 360 px de ancho.
- Funciones pequeñas, sin dependencias nuevas sin justificarlas en el commit.

## 10. Tareas frecuentes (paso a paso)

**Agregar un atributo a una entidad (ej. `temporada` en `PaqueteLocal`)**
1. Editar el metamodelo en `modelos/pim/goruta.ecore` (y OCL si hay reglas).
2. Ajustar las transformaciones solo si el atributo requiere una regla nueva.
3. `npm run generar`.
4. Crear la migración de BD correspondiente y revisar `generado/db/schema.sql`.
5. Actualizar pruebas y, si aplica, la tabla de diccionario en `docs/`.

**Cambiar la política de markup de la agencia**
- Operación normal: desde el Back-Office. Cambios masivos: editar `modelos/dsl/politica.goruta` y regenerar. Verificar que no se traslapen vigencias (INV-03).

**Agregar un endpoint**
- Si es CRUD de una metaclase administrable, **modifica el modelo y regenera** el router. Si es lógica de negocio, escribe el servicio en `manual/backend/servicios/` y un controlador delgado.

**Soportar otro proveedor turístico**
- Implementar `ProveedorTuristico` en `manual/backend/integraciones/<proveedor>/` con su normalizador; no modificar servicios ni el PIM.

## 11. Pruebas

- La matriz de casos CP-01 a CP-68 (Capítulo 7 de la documentación) es el criterio de aceptación. Cada cambio de comportamiento debe cubrirse con una prueba y, si corresponde, actualizar su estado en la matriz.
- Mínimos por tipo de cambio: cálculo de precios y TTL → pruebas unitarias con los ejemplos numéricos de RN-01 a RN-04; caché o proveedor → pruebas de integración con el proveedor simulado (hit, miss, expiración, cuota); checkout → casos de cambio de tarifa y de no disponibilidad; modelo → prueba de regeneración (dos ejecuciones sin cambios producen archivos idénticos; el código de `manual/` no cambia).
- Las pruebas no deben llamar a servicios externos reales.

## 12. Documentación

- La documentación técnica está en `docs/` (LaTeX). Si cambias modelos, reglas, endpoints o el esquema de datos, actualiza la sección correspondiente en el mismo cambio.
- Los diagramas fuente están en Mermaid (`docs/figuras/*.mmd`) y se exportan a PNG con el mismo nombre. No edites los PNG sin actualizar el `.mmd`.
- Compilar: `pdflatex main.tex` (dos o tres pasadas).

## 13. Flujo de trabajo y commits

- Ramas por tarea: `feat/…`, `fix/…`, `docs/…`, `modelo/…`.
- Commits pequeños y descriptivos en español, en imperativo (por ejemplo: `Agregar validación de pasaporte vigente (INV-07)`). Un commit que toca modelos debe incluir también los archivos regenerados.
- No hagas *force push* a la rama principal ni reescribas historia compartida.
- Antes de abrir un cambio: `npm run generar` (si aplica), `npm run lint`, `npm test`.

## 14. Qué NO hacer

- No editar archivos de `generado/`.
- No saltarse el proveedor simulado ni llamar a APIs externas directamente.
- No exponer el markup, el precio base ni credenciales al cliente público.
- No cambiar el precio de una reserva confirmada.
- No agregar dependencias pesadas o servicios externos sin justificación (el equipo es pequeño y el sistema debe ser fácil de mantener).
- No eliminar datos físicamente donde el modelo prevé eliminación lógica (paquetes).
- No inventar contratos de API del proveedor: si no estás seguro, pregunta o consulta la documentación vigente.
- No ignorar una invariante OCL fallida "para que pase la prueba": corrige el dato o el modelo.

## 15. Cuando tengas dudas

1. Busca la respuesta en la documentación (`docs/`): requisitos RF/RNF, reglas RN y casos de uso CU.
2. Si la ambigüedad persiste, pregunta al usuario antes de asumir; no tomes decisiones que cambien el dominio sin pasar por el modelo.
3. Deja constancia de las suposiciones en el mensaje del commit o en la descripción del cambio.
