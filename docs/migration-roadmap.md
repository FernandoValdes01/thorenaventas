# Roadmap MVP -> Backend

## Fase 1 (completada en esta etapa)

- Estructura backend inicial creada.
- API versionada `/api/v1` preparada.
- Healthcheck `/health` preparado.
- Esquema Drizzle inicial creado para dominios base.
- Capa frontend de servicios/API/types inicial creada.
- Variables de entorno documentadas (`.env.example` frontend y backend).

## Fase 2 (en progreso)

- [x] Migrar `src/App.jsx` a `src/App.tsx`.
- [x] Migrar `src/components/SalesView.jsx` a `src/components/SalesView.tsx`.
- [x] Migrar `src/main.jsx` a `src/main.tsx`.
- [ ] Migrar `ERPView` y `ProductsView` a `.tsx`.
- [ ] Tipar estado compartido y utilidades de `catalog`/`storage`.

## Fase 3

- Implementar servicios reales en backend con Drizzle.
- Reemplazar stubs en rutas por lógica de negocio.
- Aplicar validación Zod completa en cada endpoint.

## Fase 4

- Integración Better Auth real (users/sessions/accounts).
- Flujo login/logout/session en frontend contra backend.
- Protección de rutas frontend y backend por rol.

## Fase 5

- Migración progresiva de módulos frontend desde localStorage a API:
  1. clients/products/scales/city-rates/payment-methods
  2. orders/order-items
  3. quotes/quote-items
  4. dashboard/cobranzas
  5. routes/purchases/suppliers/sales

## Notas de compatibilidad

- Mientras no exista reemplazo API estable, mantener fallback localStorage.
- No eliminar seeds hasta terminar migración por módulo.
