import bcrypt from 'bcryptjs';
import { recordAudit, fetchRow } from '@/lib/audit';

// Loads a set of demonstration data (investors, sales staff, investor users,
// vehicles with costs, history and audit entries) scoped to a single company,
// so every menu and tab shows realistic content. Free-text fields are written
// bilingually ("PT / EN") so the demo reads well in both languages.

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export async function isDemoLoaded(db, companyId) {
  const marker = await db.prepare('SELECT id FROM users WHERE email = ?').get(`ana.costa.demo${companyId}@demo.local`);
  return !!marker;
}

export async function seedDemoCompany(db, companyId, actor) {
  if (await isDemoLoaded(db, companyId)) {
    return { ok: false, message: 'Os dados de demonstração já foram carregados para esta empresa.' };
  }

  // A director to hang the sales staff under (any existing user of the company).
  const director = await db.prepare("SELECT id FROM users WHERE company_id = ? AND role = 'director' ORDER BY id LIMIT 1").get(companyId)
    || await db.prepare('SELECT id FROM users WHERE company_id = ? ORDER BY id LIMIT 1').get(companyId);
  const directorId = director?.id || null;
  const pass = bcrypt.hashSync('demo1234', 10);
  const actorCtx = { ...actor, company_id: companyId };

  // ---- Investors ----
  const investorsData = [
    { name: 'Investimentos Atlântico', email: `atlantico.demo${companyId}@demo.local`, phone: '+351 912 000 111', notes: 'Investidor institucional / Institutional investor' },
    { name: 'Carlos Meireles', email: `meireles.demo${companyId}@demo.local`, phone: '+351 913 222 333', notes: 'Investidor particular / Private investor' },
    { name: 'Fundo Douro Capital', email: `douro.demo${companyId}@demo.local`, phone: '+351 914 444 555', notes: 'Fundo de investimento / Investment fund' },
  ];
  const investorIds = [];
  for (const inv of investorsData) {
    const r = await db.prepare('INSERT INTO investors (name, email, phone, notes, company_id) VALUES (?, ?, ?, ?, ?)')
      .run(inv.name, inv.email, inv.phone, inv.notes, companyId);
    investorIds.push(Number(r.lastInsertRowid));
    await recordAudit(db, { entity: 'investors', entityId: Number(r.lastInsertRowid), action: 'insert', actor: actorCtx, after: await fetchRow(db, 'investors', r.lastInsertRowid) });
  }

  // ---- Sales staff (comerciais) ----
  const staffData = [
    { name: 'Ana Costa', email: `ana.costa.demo${companyId}@demo.local`, phone: '+351 961 111 222' },
    { name: 'Bruno Ferreira', email: `bruno.ferreira.demo${companyId}@demo.local`, phone: '+351 962 333 444' },
  ];
  const staffIds = [];
  for (const s of staffData) {
    const r = await db.prepare("INSERT INTO users (name, email, password, role, director_id, phone, company_id) VALUES (?, ?, ?, 'comercial', ?, ?, ?)")
      .run(s.name, s.email, pass, directorId, s.phone, companyId);
    staffIds.push(Number(r.lastInsertRowid));
    await recordAudit(db, { entity: 'users', entityId: Number(r.lastInsertRowid), action: 'insert', actor: actorCtx, after: await fetchRow(db, 'users', r.lastInsertRowid) });
  }

  // ---- Investor users (linked to the first two investors) ----
  const investorUsers = [
    { name: 'Investimentos Atlântico', email: `user.atlantico.demo${companyId}@demo.local`, investor_id: investorIds[0] },
    { name: 'Carlos Meireles', email: `user.meireles.demo${companyId}@demo.local`, investor_id: investorIds[1] },
  ];
  for (const u of investorUsers) {
    const r = await db.prepare("INSERT INTO users (name, email, password, role, director_id, investor_id, company_id) VALUES (?, ?, ?, 'investidor', ?, ?, ?)")
      .run(u.name, u.email, pass, directorId, u.investor_id, companyId);
    await recordAudit(db, { entity: 'users', entityId: Number(r.lastInsertRowid), action: 'insert', actor: actorCtx, after: await fetchRow(db, 'users', r.lastInsertRowid) });
  }

  // ---- Vehicles ----
  // status: em_stock | reservado | vendido ; vehicle_type: stock | investidor
  const vehiclesData = [
    { brand: 'BMW', model: '320d', year: 2019, plate: 'AA-01-BB', vin: 'WBA8E9105KA000001', color: 'Preto / Black', mileage: 78000, fuel: 'Diesel', purchase: 21500, sale: 26900, status: 'vendido', type: 'stock', investor: null, staff: 0, notes: 'Nacional, único dono / Domestic, single owner', soldAgo: 12 },
    { brand: 'Audi', model: 'A4 Avant', year: 2020, plate: 'AB-12-CD', vin: 'WAUZZZ8K9BA000002', color: 'Cinzento / Grey', mileage: 62000, fuel: 'Diesel', purchase: 24000, sale: null, status: 'em_stock', type: 'stock', investor: null, staff: 1, notes: 'Full extras / Todos os extras', soldAgo: null },
    { brand: 'Mercedes-Benz', model: 'C 200', year: 2018, plate: 'AC-34-EF', vin: 'WDD2050451F000003', color: 'Branco / White', mileage: 95000, fuel: 'Gasolina / Petrol', purchase: 19800, sale: null, status: 'reservado', type: 'stock', investor: null, staff: 0, notes: 'Reservado com sinal / Reserved with deposit', soldAgo: null },
    { brand: 'Volkswagen', model: 'Golf GTD', year: 2021, plate: 'AD-56-GH', vin: 'WVWZZZ1KZAW000004', color: 'Azul / Blue', mileage: 41000, fuel: 'Diesel', purchase: 27500, sale: 31900, status: 'vendido', type: 'stock', investor: null, staff: 1, notes: 'Garantia de fábrica / Factory warranty', soldAgo: 5 },
    { brand: 'Tesla', model: 'Model 3', year: 2022, plate: 'AE-78-IJ', vin: '5YJ3E1EA7KF000005', color: 'Branco / White', mileage: 28000, fuel: 'Elétrico / Electric', purchase: 34000, sale: null, status: 'em_stock', type: 'investidor', investor: 0, staff: 0, notes: 'Financiado por investidor / Investor-funded', soldAgo: null },
    { brand: 'Porsche', model: 'Cayman', year: 2017, plate: 'AF-90-KL', vin: 'WP0ZZZ98ZHS000006', color: 'Vermelho / Red', mileage: 54000, fuel: 'Gasolina / Petrol', purchase: 48000, sale: 57500, status: 'vendido', type: 'investidor', investor: 0, staff: 1, notes: 'Peça de coleção / Collector piece', soldAgo: 20 },
    { brand: 'Renault', model: 'Clio', year: 2020, plate: 'AG-11-MN', vin: 'VF1RJA00X64000007', color: 'Cinzento / Grey', mileage: 66000, fuel: 'Gasolina / Petrol', purchase: 11500, sale: null, status: 'em_stock', type: 'investidor', investor: 1, staff: 0, notes: 'Citadino económico / Economical city car', soldAgo: null },
    { brand: 'Toyota', model: 'Corolla Hybrid', year: 2021, plate: 'AH-22-OP', vin: 'SB1KH3JE60E000008', color: 'Azul / Blue', mileage: 39000, fuel: 'Híbrido / Hybrid', purchase: 22000, sale: 25400, status: 'vendido', type: 'investidor', investor: 1, staff: 0, notes: 'Baixo consumo / Low consumption', soldAgo: 3 },
  ];

  for (const v of vehiclesData) {
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

    // History: created + (sold) status change
    await db.prepare("INSERT INTO vehicle_history (vehicle_id, changed_by, changed_by_name, action, changes, created_at) VALUES (?, ?, ?, 'created', ?, ?)")
      .run(vehicleId, createdBy, 'Demo', 'Viatura registada / Vehicle registered', createdAt);
    if (v.status === 'vendido') {
      await db.prepare("INSERT INTO vehicle_history (vehicle_id, changed_by, changed_by_name, action, changes, created_at) VALUES (?, ?, ?, 'updated', ?, ?)")
        .run(vehicleId, createdBy, 'Demo', `Estado: vendido / Status: sold — €${v.sale}`, updatedAt);
    }

    await recordAudit(db, { entity: 'vehicles', entityId: vehicleId, action: 'insert', actor: actorCtx, after: await fetchRow(db, 'vehicles', vehicleId) });

    // Costs (1-3 per vehicle)
    const costs = [
      { type: 'Transporte / Transport', amount: Math.round(v.purchase * 0.02), desc: 'Transporte para o stand / Transport to showroom' },
      { type: 'Manutenção / Maintenance', amount: Math.round(v.purchase * 0.03), desc: 'Revisão e consumíveis / Service and consumables' },
    ];
    if (v.status === 'vendido') costs.push({ type: 'Preparação / Detailing', amount: 250, desc: 'Preparação para entrega / Delivery prep' });
    for (const cost of costs) {
      const cr = await db.prepare('INSERT INTO vehicle_costs (vehicle_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?)')
        .run(vehicleId, cost.type, cost.amount, cost.desc, createdAt);
      await recordAudit(db, { entity: 'vehicle_costs', entityId: Number(cr.lastInsertRowid), action: 'insert', actor: actorCtx, after: await fetchRow(db, 'vehicle_costs', cr.lastInsertRowid) });
    }
  }

  return { ok: true, message: 'Dados de demonstração carregados com sucesso.' };
}
