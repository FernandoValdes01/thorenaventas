# Roles y acceso (propuesta inicial)

## Roles

- `admin`
- `vendedor`
- `oficina`

## Matriz inicial

- `admin`
  - acceso total
  - administrar productos/proveedores/compras/tarifas/escalas
  - ver dashboard y cobranzas completas
- `vendedor`
  - crear pedidos y cotizaciones
  - ver clientes y productos
  - ver pedidos (propios o generales segun regla futura)
- `oficina`
  - revisar pedidos, pagos y despacho
  - ver cobranzas y ventas

## Estado de implementacion

- Middleware base creado en backend:
  - `authMiddleware`
  - `requireRole`
- Falta integrar Better Auth real para poblar usuario/sesion/rol.
- Actualmente la validacion de rol usa header temporal `x-user-role` (solo scaffolding).
