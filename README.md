# thorenaventas

MVP interno de ventas para Thorena Comercial.

## Estado actual

- Frontend operativo en React + Vite.
- Persistencia temporal con `localStorage` + seeds en `src/data`.
- Backend preparado en `backend/` (Hono + TypeScript + Drizzle + Zod + Better Auth base).
- Rama objetivo de desarrollo: `dev`.

## Estructura

```text
.
├─ src/                        # Frontend MVP actual
│  ├─ components/
│  ├─ data/
│  ├─ lib/
│  ├─ services/                # Capa API preparada
│  ├─ types/                   # Tipos TS iniciales
│  ├─ hooks/
│  └─ context/
├─ backend/                    # Backend nuevo
│  ├─ src/
│  │  ├─ routes/
│  │  ├─ services/
│  │  ├─ validators/
│  │  ├─ db/
│  │  ├─ middlewares/
│  │  └─ lib/
│  ├─ drizzle.config.ts
│  └─ .env.example
└─ .env.example                # Frontend
```

## Desarrollo frontend

```bash
npm install
npm run dev
```

Variables:

- `VITE_API_URL` en `.env` (ver `.env.example`).

## Desarrollo backend

```bash
cd backend
npm install
npm run dev
```

Variables backend (`backend/.env`):

- `DATABASE_URL`
- `FRONTEND_URL`
- `NODE_ENV`
- `PORT`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`

## Endpoints base

- Healthcheck: `GET /health`
- API versionada: `/api/v1/*`
- Rutas base creadas para:
  - clients, products, orders, order-items
  - quotes, quote-items
  - city-rates, volume-scales, payment-methods
  - sales, purchases, suppliers, cobranzas, routes
  - dashboard, auth

## Auth (estado)

- Better Auth integrado sobre PostgreSQL (Neon) con tablas `user/session/account/verification`.
- Frontend login usa endpoints reales:
  - `POST /api/v1/auth/sign-in/email`
  - `POST /api/v1/auth/sign-up/email`
  - `GET /api/v1/auth/get-session`
  - `POST /api/v1/auth/sign-out`

## Datos mock y hardcode actuales

Siguen activos en MVP:

- `src/data/appData.js` (incluye `LOGIN_CREDENTIALS`, `DEFAULT_SELLER`, `APP_NAME`)
- `src/data/companyInfo.js`
- `src/data/erpSeed.js`
- `src/data/erpModulesSeed.js`
- `src/data/erpCobranzas.js`
- `src/data/erpClientLastPurchase.js`
- `src/data/erpScales.json`
- Persistencia en `localStorage`/`sessionStorage` desde `src/App.jsx`.

## Deploy

### Frontend (Vercel)

1. Conectar repo en Vercel.
2. Configurar variable `VITE_API_URL` apuntando al backend Railway.
3. Build command: `npm run build`.
4. Output: `dist`.

### Backend (Railway)

1. Crear servicio apuntando a carpeta `backend/`.
2. Configurar variables de entorno de `backend/.env.example`.
3. Asegurar `PORT` por `process.env.PORT` (ya soportado).
4. Start command: `npm run start` (tras build) o flujo Railway estándar.

### PostgreSQL (Neon)

1. Crear proyecto Neon.
2. Copiar connection string a `DATABASE_URL`.
3. Ejecutar migraciones:

```bash
cd backend
npm run db:generate
npm run db:migrate
```

Para limpiar datos operativos conservando usuarios/login:

```bash
cd backend
npm run db:clear
```

Para borrar tambien usuarios/login, usar `npm run db:clear -- --include-auth`.

Para poblar la base con muchos datos de prueba (clientes, pedidos, deudas pendientes/vencidas/pagadas, ventas, rutas, compras):

```bash
cd backend
npm run db:seed:demo
```

## TODOs principales siguientes

1. Migrar frontend completo a TypeScript (`.tsx/.ts`) por fases.
2. Implementar Better Auth real con tablas y sesiones.
3. Reemplazar almacenamiento local por API por módulos.
4. Aplicar validación Zod en todas las rutas (body/params/query) y servicios reales con Drizzle.
5. Implementar control de roles real (`admin`, `vendedor`, `oficina`).
6. Implementar generación segura de códigos `PED`/`COT` en backend.
