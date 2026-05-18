# Auditoria de datos hardcodeados y fuentes actuales

## Hardcode directo en frontend

- `src/data/appData.js`
  - `LOGIN_CREDENTIALS`
  - `DEFAULT_SELLER`
  - `APP_NAME`, `APP_SUBTITLE`, `APP_LOCATION`
  - `PRODUCTS` fallback
- `src/data/companyInfo.js`
  - nombre/telefono/rut/email de empresa

## Seeds/mock estructurados

- `src/data/erpSeed.js`
  - `ERP_CLIENTS`, `ERP_PRODUCTS`, `ERP_PAYMENT_METHODS`
- `src/data/erpModulesSeed.js`
  - `ERP_SCALES`, `ERP_SUPPLIERS`, `ERP_PURCHASES`, `ERP_ROUTES`, `ERP_SALES`, `ERP_PRODUCTS_FULL`, `ERP_CITY_RATES`
- `src/data/erpCobranzas.js`
- `src/data/erpClientLastPurchase.js`
- `src/data/erpScales.json`

## Persistencia local actual

`src/App.jsx` guarda en `localStorage`:

- orders
- products
- clients
- cobranzas
- erpRoutes
- erpScales
- erpPurchases
- erpSales
- erpProductsFull
- erpSuppliers
- erpCityRates

`sessionStorage`:

- auth
- activeView

## Funcionalidades reales existentes (MVP)

- Login local temporal (usuario/clave hardcode)
- Ventas (terreno/online/oficina)
- Cotizacion PDF + carga de cotizacion PDF
- Pedidos con estados ERP
- Inventario visual
- Clientes + resumen de deuda
- ERP: dashboard, clientes, rutas, escalas, compras, productos, ventas, proveedores, tarifas por ciudad

## Estado de migracion hacia API

- Capa inicial creada en `src/lib/api.ts` y `src/services/*`.
- Tipos TS iniciales en `src/types/*`.
- El UI aun usa estado local/seeds para no romper MVP.
