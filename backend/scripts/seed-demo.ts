import { eq, sql } from 'drizzle-orm';
import { db } from '../src/db/client';
import {
  cityRates,
  clients,
  cobranzas,
  orderItems,
  orders,
  paymentMethods,
  products,
  purchases,
  routes,
  sales,
  suppliers,
  volumeScales,
} from '../src/db/schema';

const BUSINESS_TABLES = [
  'app_state',
  'sales',
  'order_items',
  'orders',
  'quote_items',
  'quotes',
  'purchases',
  'products',
  'suppliers',
  'cobranzas',
  'routes',
  'city_rates',
  'volume_scales',
  'payment_methods',
  'clients',
] as const;

const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Debito/Credito', 'Credito 7 dias', 'Credito 15 dias'];
const SALE_CHANNELS = ['terreno', 'online', 'oficina'] as const;
const ORDER_STATUSES = ['Cotizado', 'Pedido', 'Preparando', 'Despachado', 'Pagado', 'Pendiente de pago', 'Anulado'];
const CLIENT_TYPES = ['Negocio fijo', 'Mayorista', 'Minorista', 'Distribuidor', 'Cafeteria', 'Restaurant', 'Hotel/Hostal'];
const CITIES = ['Villarrica', 'Pucon', 'Lican Ray', 'Conaripe', 'Pitrufquen', 'Curarrehue'];
const SECTORS = ['Centro', 'Segunda Faja', 'Molco', 'Aeropuerto', 'Costanera', 'Las Encinas'];
const SELLERS = ['Jorge', 'Ruta 2'];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample<T>(items: T[]) {
  return items[randInt(0, items.length - 1)];
}

function maybe(probability = 0.5) {
  return Math.random() < probability;
}

function addDays(base: Date, days: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

function money(value: number) {
  return String(Math.max(0, Math.round(value)));
}

function numberValue(value: unknown) {
  return Number(value) || 0;
}

async function truncateBusinessTables() {
  for (const table of BUSINESS_TABLES) {
    const exists = await db.execute(sql`select to_regclass(${`public.${table}`}) as regclass`);
    if (!exists.rows[0]?.regclass) continue;
    await db.execute(sql.raw(`truncate table public."${table}" restart identity cascade;`));
  }
}

async function main() {
  await truncateBusinessTables();

  await db.insert(paymentMethods).values(PAYMENT_METHODS.map((name) => ({ name })));

  await db.insert(cityRates).values([
    { city: 'Villarrica', rate: '0' },
    { city: 'Pucon', rate: '0.025' },
    { city: 'Lican Ray', rate: '0.03' },
    { city: 'Conaripe', rate: '0.05' },
    { city: 'Pitrufquen', rate: '0.07' },
    { city: 'Curarrehue', rate: '0.06' },
  ]);

  await db.insert(volumeScales).values([
    { label: 'Minorista', minQuantity: 1, maxQuantity: 9, discountRate: '0', objective: 'Venta base', comment: '' },
    { label: 'Intermedio', minQuantity: 10, maxQuantity: 24, discountRate: '0.03', objective: 'Aumentar ticket', comment: '' },
    { label: 'Mayorista', minQuantity: 25, maxQuantity: 60, discountRate: '0.08', objective: 'Rotacion', comment: '' },
    { label: 'Distribuidor', minQuantity: 61, maxQuantity: 200, discountRate: '0.12', objective: 'Volumen', comment: '' },
  ]);

  const supplierRows = await db
    .insert(suppliers)
    .values(
      Array.from({ length: 20 }, (_, index) => ({
        name: `Proveedor ${index + 1}`,
        contact: `Contacto ${index + 1}`,
        phone: `+5697${String(1000000 + index).slice(-7)}`,
        email: `proveedor${index + 1}@demo.cl`,
        status: maybe(0.9) ? 'Activo' : 'Inactivo',
        notes: maybe(0.25) ? 'Proveedor con convenio anual.' : '',
      })),
    )
    .returning();

  const productRows = await db
    .insert(products)
    .values(
      Array.from({ length: 80 }, (_, index) => {
        const supplier = sample(supplierRows);
        const purchaseCost = randInt(450, 9200);
        const transportUnit = randInt(0, 450);
        const finalCost = purchaseCost + transportUnit;
        const basePrice = Math.round(finalCost * (1 + randInt(15, 55) / 100));
        return {
          sku: `THO-${String(index + 1).padStart(4, '0')}`,
          supplierId: supplier.id,
          name: `Producto ${index + 1}`,
          barcode: `780${String(100000000 + index)}`,
          brand: sample(['Thorena', 'Andina', 'Score', 'DelSur', 'Valle']) as string,
          unit: sample(['Unidad', 'Caja', 'Pack']) as string,
          category: sample(['Bebidas', 'Abarrotes', 'Limpieza', 'Higiene', 'Otros']) as string,
          stock: randInt(12, 240),
          stockMin: randInt(6, 60),
          purchaseCost: money(purchaseCost),
          transportUnit: money(transportUnit),
          finalCost: money(finalCost),
          location: `Bodega ${sample(['A', 'B', 'C'])}`,
          basePrice: money(basePrice),
          status: maybe(0.95) ? 'Activo' : 'Inactivo',
        };
      }),
    )
    .returning();

  const clientRows = await db
    .insert(clients)
    .values(
      Array.from({ length: 140 }, (_, index) => ({
        code: `CLI-${String(index + 1).padStart(4, '0')}`,
        name: `Cliente ${index + 1}`,
        type: sample(CLIENT_TYPES) as string,
        rut: `${randInt(7, 25)}.${randInt(100, 999)}.${randInt(100, 999)}-${randInt(0, 9)}`,
        phone: `+569${randInt(10000000, 99999999)}`,
        whatsapp: maybe(0.8) ? `+569${randInt(10000000, 99999999)}` : '',
        contact: `Encargado ${index + 1}`,
        email: maybe(0.8) ? `cliente${index + 1}@demo.cl` : '',
        instagram: maybe(0.25) ? `@cliente${index + 1}` : '',
        address: `Calle ${randInt(10, 990)} #${randInt(1, 450)}`,
        zone: sample(CITIES) as string,
        sector: sample(SECTORS) as string,
        frequency: sample(['Semanal', 'Quincenal', 'Mensual']) as string,
        status: maybe(0.92) ? 'Activo' : 'Inactivo',
        creditEnabled: maybe(0.45),
        debt: '0',
        monthlyTarget: money(randInt(350000, 1800000)),
        accumulatedSales: money(randInt(50000, 1800000)),
        goalProgress: String((randInt(0, 100) / 100).toFixed(2)),
        creditLimit: money(randInt(100000, 2200000)),
        notes: maybe(0.3) ? 'Prefiere entrega AM.' : '',
        observations: '',
      })),
    )
    .returning();

  const now = new Date();

  const orderRows = [] as Array<typeof orders.$inferSelect>;
  for (let index = 1; index <= 360; index += 1) {
    const client = sample(clientRows);
    const status = sample(ORDER_STATUSES) as (typeof ORDER_STATUSES)[number];
    const paymentMethod = sample(PAYMENT_METHODS) as string;
    const saleChannel = sample(SALE_CHANNELS);
    const city = client.zone || sample(CITIES);
    const dispatchRate = city === 'Villarrica' ? 0 : randInt(2, 7) / 100;
    const createdAt = addDays(now, -randInt(0, 90));

    const selectedProducts = Array.from({ length: randInt(1, 4) }, () => sample(productRows));
    let subtotalBeforeDiscount = 0;
    let itemsTotal = 0;

    const createdOrder = await db
      .insert(orders)
      .values({
        code: `PED-${String(index).padStart(4, '0')}`,
        clientId: client.id,
        customerName: client.name,
        customerRut: client.rut,
        customerNumber: client.phone,
        contactPhone: client.phone,
        deliveryAddress: client.address,
        sellerName: sample(SELLERS) as string,
        sellerRut: '13.274.992-1',
        clientTypeSnapshot: client.type,
        zoneSnapshot: client.zone,
        sectorSnapshot: client.sector,
        debtSnapshot: client.debt,
        saleChannel,
        status,
        paymentMethod,
        subtotalBeforeDiscount: '0',
        totalDiscountAmount: '0',
        itemsTotal: '0',
        dispatchCity: city,
        dispatchRate: String(dispatchRate),
        dispatchSurcharge: '0',
        total: '0',
        observations: maybe(0.2) ? 'Pedido de prueba poblado automaticamente.' : '',
        showReceipt: maybe(0.35),
        createdAt,
        updatedAt: createdAt,
      })
      .returning();

    for (const product of selectedProducts) {
      const quantity = randInt(1, 24);
      const basePrice = randInt(0, 1) ? Number(product.basePrice) : Math.round(Number(product.basePrice) * 1.05);
      const discountRate = sample([0, 0.03, 0.05, 0.08]);
      const unitPrice = Math.max(0, Math.round(basePrice * (1 - discountRate)));
      const lineSubtotalBeforeScale = basePrice * quantity;
      const lineSubtotal = unitPrice * quantity;
      const discountAmount = Math.max(0, lineSubtotalBeforeScale - lineSubtotal);

      subtotalBeforeDiscount += lineSubtotalBeforeScale;
      itemsTotal += lineSubtotal;

      await db.insert(orderItems).values({
        orderId: createdOrder[0].id,
        productId: product.id,
        productNameSnapshot: product.name,
        quantity,
        basePrice: money(basePrice),
        offerDiscountPercent: '0',
        unitPriceBeforeScale: money(basePrice),
        unitPrice: money(unitPrice),
        volumeScaleId: '',
        volumeScaleLabel: discountRate > 0 ? 'Escala demo' : 'Sin escala',
        volumeDiscountRate: String(discountRate),
        volumeDiscountPercent: String(Math.round(discountRate * 100)),
        subtotalBeforeScale: money(lineSubtotalBeforeScale),
        discountAmount: money(discountAmount),
        subtotal: money(lineSubtotal),
      });
    }

    const dispatchSurcharge = Math.round(itemsTotal * dispatchRate);
    const totalDiscountAmount = Math.max(0, subtotalBeforeDiscount - itemsTotal);
    const total = itemsTotal + dispatchSurcharge;

    await db
      .update(orders)
      .set({
        subtotalBeforeDiscount: money(subtotalBeforeDiscount),
        totalDiscountAmount: money(totalDiscountAmount),
        itemsTotal: money(itemsTotal),
        dispatchSurcharge: money(dispatchSurcharge),
        total: money(total),
      })
      .where(eq(orders.id, createdOrder[0].id));

    orderRows.push({ ...createdOrder[0], total: money(total), paymentMethod, status });

    if (status === 'Pagado') {
      const firstProduct = selectedProducts[0];
      const saleValue = Math.max(0, Math.round(total / Math.max(1, selectedProducts.length)));
      const costValue = Math.max(0, Math.round(Number(firstProduct.finalCost) * randInt(1, 12)));
      const profit = Math.max(0, saleValue - costValue);
      await db.insert(sales).values({
        orderId: createdOrder[0].id,
        date: createdAt,
        client: client.name,
        zone: client.zone,
        sector: client.sector,
        seller: sample(SELLERS) as string,
        orderCode: createdOrder[0].code,
        product: firstProduct.name,
        sale: money(saleValue),
        cost: money(costValue),
        profit: money(profit),
        marginPct: String(saleValue > 0 ? profit / saleValue : 0),
        paymentMethod,
        dispatchStatus: 'Pagado',
        total: money(saleValue),
      });
    }
  }

  const clientDebtById = new Map<string, number>();
  const creditOrders = orderRows.filter((order) => ['Credito 7 dias', 'Credito 15 dias'].includes(order.paymentMethod));
  const overdueCutoff = addDays(now, -1);

  for (const order of creditOrders.slice(0, 180)) {
    const totalAmount = Math.max(0, numberValue(order.total));
    const days = order.paymentMethod === 'Credito 15 dias' ? 15 : 7;
    const issueDate = addDays(new Date(order.createdAt), randInt(0, 2));
    const dueDate = addDays(issueDate, days);
    const status =
      order.status === 'Pagado'
        ? 'Pagada'
        : dueDate < overdueCutoff
          ? 'Vencido'
          : sample(['Pendiente', 'Pendiente', 'Pendiente', 'Pagada']);
    const paidAmount = status === 'Pagada' ? totalAmount : sample([0, Math.round(totalAmount * 0.2), Math.round(totalAmount * 0.5)]);
    const balance = Math.max(0, totalAmount - paidAmount);

    await db.insert(cobranzas).values({
      clientId: order.clientId,
      clientName: order.customerName,
      document: order.code,
      issueDate,
      dueDate,
      amount: money(totalAmount),
      paidAmount: money(paidAmount),
      balance: money(balance),
      status: balance <= 0 ? 'Pagada' : status,
      notes: balance <= 0 ? 'Saldo regularizado.' : 'Cobranza activa de prueba.',
      createdAt: issueDate,
      updatedAt: issueDate,
    });

    if (order.clientId) {
      clientDebtById.set(order.clientId, (clientDebtById.get(order.clientId) || 0) + balance);
    }
  }

  for (const client of clientRows) {
    const debt = clientDebtById.get(client.id) || 0;
    await db
      .update(clients)
      .set({ debt: money(debt), lastPurchase: addDays(now, -randInt(0, 50)), updatedAt: sql`now()` })
      .where(eq(clients.id, client.id));
  }

  await db.insert(routes).values(
    Array.from({ length: 90 }, () => {
      const visited = randInt(8, 45);
      const withOrder = randInt(3, visited);
      const effectiveness = visited > 0 ? withOrder / visited : 0;
      return {
        date: addDays(now, -randInt(0, 70)),
        zone: sample(CITIES) as string,
        sector: sample(SECTORS) as string,
        seller: sample(SELLERS) as string,
        visitedClients: visited,
        clientsWithOrder: withOrder,
        sales: money(randInt(150000, 1400000)),
        effectivenessPct: String(effectiveness),
        kmRoute: randInt(24, 190),
        fuel: money(randInt(18000, 96000)),
        observation: maybe(0.3) ? 'Ruta con trafico medio.' : '',
      };
    }),
  );

  await db.insert(purchases).values(
    Array.from({ length: 220 }, () => {
      const product = sample(productRows);
      const quantity = randInt(5, 80);
      const unitCost = Math.max(100, numberValue(product.purchaseCost));
      const transportUnit = Math.max(0, numberValue(product.transportUnit));
      const date = addDays(now, -randInt(0, 120));
      return {
        supplierId: product.supplierId,
        productId: product.id,
        date,
        purchaseOrder: `OC-${randInt(1000, 9999)}`,
        quantity,
        unitCost: money(unitCost),
        transportUnit: money(transportUnit),
        totalCost: money(quantity * (unitCost + transportUnit)),
        reception: sample(['Recibido', 'Pendiente', 'Con observacion']) as string,
        doc: `FAC-${randInt(10000, 99999)}`,
        observation: maybe(0.2) ? 'Pedido con observacion de prueba.' : '',
      };
    }),
  );

  console.log('Seed demo completado:');
  console.log('- Clientes: 140');
  console.log('- Productos: 80');
  console.log('- Pedidos: 360');
  console.log('- Cobranzas: 180 (mezcla de Pendiente, Vencido, Pagada)');
  console.log('- Ventas: generadas para pedidos Pagados');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error al poblar base de datos demo:', error);
    process.exit(1);
  });
