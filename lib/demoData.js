import bcrypt from 'bcryptjs';
import { recordAudit, fetchRow } from '@/lib/audit';

// Loads a set of demonstration data (investors, sales staff, investor users,
// vehicles with costs, history and audit entries) scoped to a single company,
// so every menu and tab shows realistic content. The dataset is localised:
// 'en' uses American names and vehicles, 'pt' uses Portuguese ones.

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

const DATASETS = {
  en: {
    investors: [
      { name: 'Summit Capital Partners', phone: '+1 (415) 555-0110', notes: 'Institutional investor' },
      { name: 'Robert Miller', phone: '+1 (312) 555-0182', notes: 'Private investor' },
      { name: 'Liberty Auto Fund', phone: '+1 (646) 555-0143', notes: 'Investment fund' },
    ],
    staff: [
      { name: 'Michael Johnson', phone: '+1 (213) 555-0117' },
      { name: 'Jessica Davis', phone: '+1 (305) 555-0164' },
    ],
    labels: {
      created: 'Vehicle registered',
      sold: (p) => `Status: sold — $${p}`,
      costs: { transport: 'Transport', maint: 'Maintenance', detail: 'Detailing' },
      costDesc: { transport: 'Transport to showroom', maint: 'Service and consumables', detail: 'Delivery prep' },
    },
    vehicles: [
      { brand: 'Ford', model: 'Mustang GT', year: 2020, plate: '8KCG244', vin: '1FA6P8CF4L5100001', color: 'Black', mileage: 41000, fuel: 'Petrol', purchase: 32500, sale: 38900, status: 'vendido', type: 'stock', investor: null, staff: 0, notes: 'One owner, clean title', soldAgo: 12 },
      { brand: 'Jeep', model: 'Grand Cherokee', year: 2021, plate: '7RTX910', vin: '1C4RJFBG7MC500002', color: 'Grey', mileage: 38000, fuel: 'Petrol', purchase: 34000, sale: null, status: 'em_stock', type: 'stock', investor: null, staff: 1, notes: 'Fully loaded', soldAgo: null },
      { brand: 'Chevrolet', model: 'Camaro', year: 2019, plate: '6MBD557', vin: '1G1FB1RX7K0100003', color: 'White', mileage: 52000, fuel: 'Petrol', purchase: 28800, sale: null, status: 'reservado', type: 'stock', investor: null, staff: 0, notes: 'Reserved with deposit', soldAgo: null },
      { brand: 'Dodge', model: 'Charger R/T', year: 2021, plate: '9PLK083', vin: '2C3CDXCT7MH600004', color: 'Blue', mileage: 29000, fuel: 'Petrol', purchase: 33500, sale: 39400, status: 'vendido', type: 'stock', investor: null, staff: 1, notes: 'Factory warranty', soldAgo: 5 },
      { brand: 'Tesla', model: 'Model 3', year: 2022, plate: '5XYT621', vin: '5YJ3E1EA7NF700005', color: 'White', mileage: 21000, fuel: 'Electric', purchase: 36000, sale: null, status: 'em_stock', type: 'investidor', investor: 0, staff: 0, notes: 'Investor-funded', soldAgo: null },
      { brand: 'Cadillac', model: 'Escalade', year: 2018, plate: '4TRV338', vin: '1GYS4HKJ0JR800006', color: 'Black', mileage: 61000, fuel: 'Petrol', purchase: 45000, sale: 52500, status: 'vendido', type: 'investidor', investor: 0, staff: 1, notes: 'Premium trim', soldAgo: 20 },
      { brand: 'Ford', model: 'F-150', year: 2020, plate: '2HGD772', vin: '1FTFW1E43LF900007', color: 'Silver', mileage: 47000, fuel: 'Petrol', purchase: 30500, sale: null, status: 'em_stock', type: 'investidor', investor: 1, staff: 0, notes: 'Work-ready pickup', soldAgo: null },
      { brand: 'Chevrolet', model: 'Corvette', year: 2021, plate: '1CVT909', vin: '1G1YB2D40M5100008', color: 'Red', mileage: 15000, fuel: 'Petrol', purchase: 62000, sale: 71800, status: 'vendido', type: 'investidor', investor: 1, staff: 0, notes: 'Collector piece', soldAgo: 3 },
    ],
  },
  pt: {
    investors: [
      { name: 'Investimentos Atlântico', phone: '+351 912 000 111', notes: 'Investidor institucional' },
      { name: 'Carlos Meireles', phone: '+351 913 222 333', notes: 'Investidor particular' },
      { name: 'Fundo Douro Capital', phone: '+351 914 444 555', notes: 'Fundo de investimento' },
    ],
    staff: [
      { name: 'Ana Costa', phone: '+351 961 111 222' },
      { name: 'Bruno Ferreira', phone: '+351 962 333 444' },
    ],
    labels: {
      created: 'Viatura registada',
      sold: (p) => `Estado: vendido — €${p}`,
      costs: { transport: 'Transporte', maint: 'Manutenção', detail: 'Preparação' },
      costDesc: { transport: 'Transporte para o stand', maint: 'Revisão e consumíveis', detail: 'Preparação para entrega' },
    },
    vehicles: [
      { brand: 'BMW', model: '320d', year: 2019, plate: 'AA-01-BB', vin: 'WBA8E9105KA000001', color: 'Preto', mileage: 78000, fuel: 'Diesel', purchase: 21500, sale: 26900, status: 'vendido', type: 'stock', investor: null, staff: 0, notes: 'Nacional, único dono', soldAgo: 12 },
      { brand: 'Audi', model: 'A4 Avant', year: 2020, plate: 'AB-12-CD', vin: 'WAUZZZ8K9BA000002', color: 'Cinzento', mileage: 62000, fuel: 'Diesel', purchase: 24000, sale: null, status: 'em_stock', type: 'stock', investor: null, staff: 1, notes: 'Todos os extras', soldAgo: null },
      { brand: 'Mercedes-Benz', model: 'C 200', year: 2018, plate: 'AC-34-EF', vin: 'WDD2050451F000003', color: 'Branco', mileage: 95000, fuel: 'Gasolina', purchase: 19800, sale: null, status: 'reservado', type: 'stock', investor: null, staff: 0, notes: 'Reservado com sinal', soldAgo: null },
      { brand: 'Volkswagen', model: 'Golf GTD', year: 2021, plate: 'AD-56-GH', vin: 'WVWZZZ1KZAW000004', color: 'Azul', mileage: 41000, fuel: 'Diesel', purchase: 27500, sale: 31900, status: 'vendido', type: 'stock', investor: null, staff: 1, notes: 'Garantia de fábrica', soldAgo: 5 },
      { brand: 'Tesla', model: 'Model 3', year: 2022, plate: 'AE-78-IJ', vin: '5YJ3E1EA7KF000005', color: 'Branco', mileage: 28000, fuel: 'Elétrico', purchase: 34000, sale: null, status: 'em_stock', type: 'investidor', investor: 0, staff: 0, notes: 'Financiado por investidor', soldAgo: null },
      { brand: 'Porsche', model: 'Cayman', year: 2017, plate: 'AF-90-KL', vin: 'WP0ZZZ98ZHS000006', color: 'Vermelho', mileage: 54000, fuel: 'Gasolina', purchase: 48000, sale: 57500, status: 'vendido', type: 'investidor', investor: 0, staff: 1, notes: 'Peça de coleção', soldAgo: 20 },
      { brand: 'Renault', model: 'Clio', year: 2020, plate: 'AG-11-MN', vin: 'VF1RJA00X64000007', color: 'Cinzento', mileage: 66000, fuel: 'Gasolina', purchase: 11500, sale: null, status: 'em_stock', type: 'investidor', investor: 1, staff: 0, notes: 'Citadino económico', soldAgo: null },
      { brand: 'Toyota', model: 'Corolla Hybrid', year: 2021, plate: 'AH-22-OP', vin: 'SB1KH3JE60E000008', color: 'Azul', mileage: 39000, fuel: 'Híbrido', purchase: 22000, sale: 25400, status: 'vendido', type: 'investidor', investor: 1, staff: 0, notes: 'Baixo consumo', soldAgo: 3 },
    ],
  },
};

export async function isDemoLoaded(db, companyId) {
  const row = await db.prepare('SELECT COUNT(*) as c FROM vehicles WHERE company_id = ?').get(companyId);
  return (row?.c || 0) > 0;
}

function slug(name) {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
}

export async function seedDemoCompany(db, companyId, actor, locale = 'pt') {
  if (await isDemoLoaded(db, companyId)) {
    return { ok: false, message: 'Os dados de demonstração já foram carregados para esta empresa.' };
  }

  const D = DATASETS[locale] || DATASETS.pt;
  const director = await db.prepare("SELECT id FROM users WHERE company_id = ? AND role = 'director' ORDER BY id LIMIT 1").get(companyId)
    || await db.prepare('SELECT id FROM users WHERE company_id = ? ORDER BY id LIMIT 1').get(companyId);
  const directorId = director?.id || null;
  const pass = bcrypt.hashSync('demo1234', 10);
  const actorCtx = { ...actor, company_id: companyId };

  // ---- Investors ----
  const investorIds = [];
  for (const inv of D.investors) {
    const email = `${slug(inv.name)}.demo${companyId}@demo.local`;
    const r = await db.prepare('INSERT INTO investors (name, email, phone, notes, company_id) VALUES (?, ?, ?, ?, ?)')
      .run(inv.name, email, inv.phone, inv.notes, companyId);
    investorIds.push(Number(r.lastInsertRowid));
    await recordAudit(db, { entity: 'investors', entityId: Number(r.lastInsertRowid), action: 'insert', actor: actorCtx, after: await fetchRow(db, 'investors', r.lastInsertRowid) });
  }

  // ---- Sales staff (comerciais) ----
  const staffIds = [];
  for (const s of D.staff) {
    const email = `${slug(s.name)}.demo${companyId}@demo.local`;
    const r = await db.prepare("INSERT INTO users (name, email, password, role, director_id, phone, company_id) VALUES (?, ?, ?, 'comercial', ?, ?, ?)")
      .run(s.name, email, pass, directorId, s.phone, companyId);
    staffIds.push(Number(r.lastInsertRowid));
    await recordAudit(db, { entity: 'users', entityId: Number(r.lastInsertRowid), action: 'insert', actor: actorCtx, after: await fetchRow(db, 'users', r.lastInsertRowid) });
  }

  // ---- Investor users (linked to the first two investors) ----
  for (let i = 0; i < 2 && i < D.investors.length; i++) {
    const email = `user.${slug(D.investors[i].name)}.demo${companyId}@demo.local`;
    const r = await db.prepare("INSERT INTO users (name, email, password, role, director_id, investor_id, company_id) VALUES (?, ?, ?, 'investidor', ?, ?, ?)")
      .run(D.investors[i].name, email, pass, directorId, investorIds[i], companyId);
    await recordAudit(db, { entity: 'users', entityId: Number(r.lastInsertRowid), action: 'insert', actor: actorCtx, after: await fetchRow(db, 'users', r.lastInsertRowid) });
  }

  // ---- Vehicles ----
  const L = D.labels;
  for (const v of D.vehicles) {
    const createdBy = staffIds[v.staff] || staffIds[0] || directorId;
    const investorId = v.investor != null ? investorIds[v.investor] : null;
    const createdAt = daysAgo((v.soldAgo || 0) + 30);
    const updatedAt = v.status === 'vendido' ? daysAgo(v.soldAgo || 1) : createdAt;

    const r = await db.prepare(`
      INSERT INTO vehicles (brand, model, year, license_plate, vin, color, mileage, fuel_type, purchase_price, sale_price, status, notes, investor_id, vehicle_type, created_by, company_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      v.brand, v.model, v.year, v.plate, v.vin, v.color, v.mileage, v.fuel,
      v.purchase, v.status === 'vendido' ? v.sale : null, v.status, v.notes,
      investorId, v.type, createdBy, companyId, createdAt, updatedAt
    );
    const vehicleId = Number(r.lastInsertRowid);

    await db.prepare("INSERT INTO vehicle_history (vehicle_id, changed_by, changed_by_name, action, changes, created_at) VALUES (?, ?, ?, 'created', ?, ?)")
      .run(vehicleId, createdBy, 'Demo', L.created, createdAt);
    if (v.status === 'vendido') {
      await db.prepare("INSERT INTO vehicle_history (vehicle_id, changed_by, changed_by_name, action, changes, created_at) VALUES (?, ?, ?, 'updated', ?, ?)")
        .run(vehicleId, createdBy, 'Demo', L.sold(v.sale), updatedAt);
    }

    await recordAudit(db, { entity: 'vehicles', entityId: vehicleId, action: 'insert', actor: actorCtx, after: await fetchRow(db, 'vehicles', vehicleId) });

    const costs = [
      { type: L.costs.transport, amount: Math.round(v.purchase * 0.02), desc: L.costDesc.transport },
      { type: L.costs.maint, amount: Math.round(v.purchase * 0.03), desc: L.costDesc.maint },
    ];
    if (v.status === 'vendido') costs.push({ type: L.costs.detail, amount: 250, desc: L.costDesc.detail });
    for (const cost of costs) {
      const cr = await db.prepare('INSERT INTO vehicle_costs (vehicle_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?)')
        .run(vehicleId, cost.type, cost.amount, cost.desc, createdAt);
      await recordAudit(db, { entity: 'vehicle_costs', entityId: Number(cr.lastInsertRowid), action: 'insert', actor: actorCtx, after: await fetchRow(db, 'vehicle_costs', cr.lastInsertRowid) });
    }
  }

  return { ok: true, message: 'Dados de demonstração carregados com sucesso.' };
}
