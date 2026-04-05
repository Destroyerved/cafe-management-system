const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// ── tiny helpers ──────────────────────────────────────────────────
const rnd    = a  => a[Math.floor(Math.random() * a.length)];
const rndInt = (mn, mx) => Math.floor(Math.random() * (mx - mn + 1)) + mn;
const uid    = () => crypto.randomBytes(16).toString('hex');

// ── product catalogue  [name, price, tax%] ────────────────────────
const PRODS = {
  Food: [
    ['Masala Dosa',120,5],['Plain Dosa',90,5],['Idli (3 pcs)',80,5],['Medu Vada',70,5],
    ['Upma',80,5],['Poha',70,5],['Pav Bhaji',140,5],['Chole Bhature',160,5],
    ['Paneer Tikka',220,5],['Dal Makhani',180,5],['Paneer Butter Masala',200,5],['Rajma Chawal',150,5],
    ['Veg Biryani',180,5],['Chicken Biryani',240,5],['Butter Chicken',260,5],['Chicken Tikka',280,5],
    ['Mutton Curry',320,5],['Fish Fry',300,5],['Egg Bhurji',120,5],['Masala Omelette',100,5],
    ['Veg Sandwich',110,5],['Club Sandwich',160,5],['Grilled Sandwich',140,5],['Cheese Toast',100,5],
    ['Garlic Bread',90,5],['Frankie Veg',120,5],['Frankie Chicken',150,5],['Veg Burger',160,5],
    ['Chicken Burger',200,5],['Pizza Margherita',280,5],['Pizza BBQ Chicken',360,5],['Pasta Arrabiata',220,5],
  ],
  Drinks: [
    ['Masala Chai',40,0],['Ginger Tea',40,0],['Green Tea',50,0],['Black Coffee',60,0],
    ['Filter Coffee',50,0],['Cappuccino',120,0],['Latte',130,0],['Espresso',80,0],
    ['Cold Coffee',140,0],['Iced Latte',150,0],['Caramel Frappe',180,0],['Hot Chocolate',160,0],
    ['Turmeric Latte',130,0],['Rose Milk',80,0],['Mango Lassi',100,0],['Sweet Lassi',80,0],
    ['Chaas',50,0],['Fresh Lime Soda',70,0],['Lemonade',80,0],['Virgin Mojito',120,0],
    ['Watermelon Juice',100,0],['Orange Juice',120,0],['Pineapple Juice',110,0],['Mixed Fruit Juice',130,0],
    ['Coconut Water',80,0],['Sugarcane Juice',60,0],['Nimbu Pani',50,0],['Aam Panna',80,0],
    ['Jaljeera',60,0],['Strawberry Shake',160,0],
  ],
  Dessert: [
    ['Gulab Jamun',80,0],['Jalebi',70,0],['Rasgulla',80,0],['Kheer',100,0],
    ['Phirni',110,0],['Shahi Tukda',140,0],['Gajar Halwa',120,0],['Kulfi Malai',80,0],
    ['Mango Kulfi',90,0],['Chocolate Brownie',150,0],['Chocolate Cake Slice',160,0],['Cheesecake',200,0],
    ['Tiramisu',220,0],['Vanilla Ice Cream',100,0],['Chocolate Sundae',160,0],['Belgian Waffles',200,0],
    ['Pancake Stack',180,0],['Crepes',170,0],['Payasam',100,0],['Rabri',130,0],
    ['Laddoo',80,0],['Kaju Barfi',150,0],['Coconut Barfi',120,0],['Sandesh',110,0],
    ['Moong Dal Halwa',130,0],
  ],
  Snacks: [
    ['Bhel Puri',80,5],['Sev Puri',90,5],['Pani Puri',70,5],['Dahi Puri',90,5],
    ['Aloo Tikki',80,5],['Papdi Chaat',100,5],['Fruit Chaat',110,5],['Corn Chaat',100,5],
    ['Chicken Wings',220,5],['Cheese Fingers',160,5],['Potato Wedges',140,5],['Nachos',160,5],
    ['Mozzarella Sticks',180,5],['Veg Spring Rolls',140,5],['Veg Momos',120,5],['Chicken Momos',150,5],
    ['Peri Peri Fries',130,5],['Masala Fries',120,5],['Onion Rings',140,5],['Mix Pakora',100,5],
    ['Aloo Pakora',80,5],['Paneer Pakora',130,5],['Samosa',60,5],['Kachori',70,5],['Dhokla',90,5],
  ],
  Breakfast: [
    ['Aloo Paratha',100,5],['Gobi Paratha',110,5],['Paneer Paratha',130,5],['Dal Paratha',100,5],
    ['Methi Thepla',100,5],['Besan Chilla',100,5],['Rava Uttapam',110,5],['Neer Dosa',100,5],
    ['Appam',110,5],['Puttu',100,5],['Pesarattu',110,5],['Akki Rotti',100,5],
    ['Batata Vada',80,5],['Egg Toast',100,5],['French Toast',130,5],['Avocado Toast',200,5],
    ['Granola Bowl',180,5],['Oatmeal Bowl',160,5],['Corn Flakes',140,5],['Muesli Bowl',160,5],
    ['Curd Rice',110,5],['Veg Breakfast Platter',250,5],['Non-Veg Breakfast Platter',320,5],
    ['Masala Oats',120,5],['Banana Pancakes',160,5],
  ],
  Specials: [
    ['Veg Thali Today',280,5],['Non-Veg Thali Today',380,5],['Chefs Pasta Special',280,5],['Pasta Alfredo',260,5],
    ['Pesto Pasta',270,5],['Aglio Olio',250,5],['Mac and Cheese',240,5],['Nachos Sharing Platter',280,5],
    ['Mezze Platter',350,5],['Truffle Fries',220,5],['Black Burger',280,5],['Rainbow Sandwich',240,5],
    ['Loaded Fries',200,5],['Quinoa Bowl',280,5],['Buddha Bowl',260,5],['Acai Bowl',300,5],
    ['Smoothie Bowl',280,5],['Protein Bowl',300,5],['Grilled Veg Platter',320,5],['BBQ Chicken Platter',450,5],
    ['Cheese Fondue',480,5],['Chocolate Fondue',420,5],['Raclette Platter',500,5],['Charcuterie Board',480,5],
    ['Detox Bowl',240,5],
  ],
};

const COLORS = {
  Food:'#f97316', Drinks:'#3b82f6', Dessert:'#ec4899',
  Snacks:'#eab308', Breakfast:'#22c55e', Specials:'#a855f7',
};
const IMGS = {
  Food:      'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&q=80',
  Drinks:    'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
  Dessert:   'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&q=80',
  Snacks:    'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',
  Breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&q=80',
  Specials:  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80',
};

// ── customer name pools ───────────────────────────────────────────
const FIRST = [
  'Aarav','Aditya','Akash','Ananya','Arjun','Aryan','Diya','Fatima','Harsh','Ishaan',
  'Jiya','Kabir','Kavya','Krish','Meera','Mohammad','Naina','Neha','Om','Pooja',
  'Priya','Rahul','Raj','Riya','Rohit','Sahil','Sanvi','Sara','Sneha','Suhana',
  'Tanvi','Uday','Varun','Vidya','Vihaan','Vivek','Yash','Zara','Zoya','Amit',
];
const LAST = [
  'Shah','Patel','Modi','Joshi','Mehta','Desai','Sharma','Verma','Singh','Kumar',
  'Gupta','Agarwal','Nair','Pillai','Reddy','Iyer','Menon','Bose','Das','Ghosh',
];
const CITIES = ['Ahmedabad','Surat','Vadodara','Rajkot','Gandhinagar','Anand','Nadiad','Bharuch','Mehsana','Junagadh'];

const NOTES = [
  'Less spicy please','No onion no garlic','Extra cheese','Less oil','Well done',
  'No coriander','Extra sauce','Mild spicy','No ice in drinks','Self ordered via QR',
  null, null, null, null, null,
];
const METHODS = ['cash','cash','cash','cash','digital','digital','upi'];

// ── helper: insert lines + update order totals ────────────────────
async function buildOrder(knex, orderId, products, numLines) {
  const picked = [], seen = new Set();
  for (let i = 0; i < numLines; i++) {
    let p, t = 0;
    do { p = rnd(products); t++; } while (seen.has(p.id) && t < 10);
    seen.add(p.id);
    const qty  = rndInt(1, 3);
    const sub  = +(+p.price  * qty).toFixed(2);
    const tax  = +(sub * +p.tax_percent / 100).toFixed(2);
    picked.push({ product_id: p.id, name: p.name, qty, unit_price: +p.price, tax_pct: +p.tax_percent, sub, tax, total: +(sub + tax).toFixed(2) });
  }
  const lines = await knex('order_lines').insert(
    picked.map(p => ({
      order_id: orderId, product_id: p.product_id, quantity: p.qty,
      unit_price: p.unit_price, tax_percent: p.tax_pct, subtotal: p.sub, total: p.total,
    }))
  ).returning('*');
  const orderSub   = +picked.reduce((s, p) => s + p.sub,   0).toFixed(2);
  const orderTax   = +picked.reduce((s, p) => s + p.tax,   0).toFixed(2);
  const orderTotal = +(orderSub + orderTax).toFixed(2);
  await knex('orders').where({ id: orderId }).update({ subtotal: orderSub, tax_amount: orderTax, total: orderTotal });
  return { lines, picked, orderTotal };
}

// ── helper: pay + kitchen for a closed order ──────────────────────
async function finaliseOrder(knex, order, lines, picked, orderTotal, kitStatus) {
  await knex('payments').insert({
    order_id: order.id, method: rnd(METHODS), amount: orderTotal,
    status: 'confirmed', created_at: order.created_at,
  });
  const [ticket] = await knex('kitchen_tickets').insert({
    order_id: order.id, status: kitStatus, sent_at: order.created_at,
    completed_at: kitStatus === 'completed' ? new Date(new Date(order.created_at).getTime() + rndInt(8, 22) * 60000).toISOString() : null,
  }).returning('*');
  await knex('kitchen_ticket_items').insert(
    lines.map((l, i) => ({ ticket_id: ticket.id, order_line_id: l.id, product_name: picked[i].name, quantity: l.quantity, is_prepared: kitStatus === 'completed' }))
  );
}

// ════════════════════════════════════════════════════════════════════
exports.seed = async function (knex) {

  // ── 1. TRUNCATE (strict FK order) ─────────────────────────────────
  for (const tbl of [
    'staff_payments','customer_sessions','customer_otps','self_order_tokens',
    'kitchen_ticket_items','kitchen_tickets','payments','order_lines','orders',
    'customers','product_variants','products','product_categories',
    'tables','floors','sessions','pos_configs','users',
  ]) await knex(tbl).del();

  // ── 2. USERS ───────────────────────────────────────────────────────
  const [ah, sh, kh] = await Promise.all([
    bcrypt.hash('Admin@1234', 12), bcrypt.hash('Staff@1234', 12), bcrypt.hash('Kitchen@1234', 12),
  ]);
  const [admin, staff1, staff2] = await knex('users').insert([
    { name: 'Yug Gandhi',   email: 'admin@pos-cafe.com',  password_hash: ah, role: 'admin',   hourly_rate: 150 },
    { name: 'Raj Kumar',    email: 'raj@pos-cafe.com',    password_hash: sh, role: 'staff',   hourly_rate: 80  },
    { name: 'Priya Sharma', email: 'priya@pos-cafe.com',  password_hash: sh, role: 'staff',   hourly_rate: 80  },
    { name: 'Chef Arjun',   email: 'arjun@pos-cafe.com',  password_hash: kh, role: 'kitchen', hourly_rate: 100 },
  ]).returning('*');
  const staffPool = [staff1, staff2];

  // ── 3. POS CONFIG ──────────────────────────────────────────────────
  const [config] = await knex('pos_configs').insert({
    name: 'Cawfee Tawk Cafe', enable_cash: true, enable_digital: true,
    enable_upi: true, upi_id: '9876543210@ybl',
  }).returning('*');

  // ── 4. FLOORS & TABLES ────────────────────────────────────────────
  const [gf, ff] = await knex('floors').insert([
    { name: 'Ground Floor', pos_config_id: config.id, sequence: 1 },
    { name: 'First Floor',  pos_config_id: config.id, sequence: 2 },
  ]).returning('*');

  const tables = await knex('tables').insert([
    ...[1,2,3,4].map(n => ({ floor_id: gf.id, table_number: `G${n}`, seats: n <= 2 ? 4 : 6, qr_token: uid() })),
    ...[1,2,3,4].map(n => ({ floor_id: ff.id, table_number: `F${n}`, seats: n <= 2 ? 4 : 8, qr_token: uid() })),
  ]).returning('*');
  const tableIds = tables.map(t => t.id);

  // ── 5. CATEGORIES & PRODUCTS ──────────────────────────────────────
  const cats = await knex('product_categories').insert(
    Object.keys(PRODS).map((name, i) => ({ name, color: COLORS[name], sequence: i + 1 }))
  ).returning('*');
  const catMap = Object.fromEntries(cats.map(c => [c.name, c.id]));

  const prodRows = [];
  for (const [cat, items] of Object.entries(PRODS))
    for (const [name, price, tax] of items)
      prodRows.push({ name, price, tax_percent: tax, category_id: catMap[cat], unit_of_measure: 'Unit', is_active: true, image_url: IMGS[cat] });

  const products = await knex('products').insert(prodRows).returning('*');
  console.log(`   ✓ ${products.length} products`);

  // ── 6. 500 CUSTOMERS ──────────────────────────────────────────────
  const custRows = Array.from({ length: 500 }, (_, i) => ({
    name:        `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`,
    phone:       `${rndInt(70000, 99999)}${rndInt(10000, 99999)}`,
    city:        CITIES[i % CITIES.length],
    state:       'Gujarat',
    country:     'India',
    visit_count: rndInt(1, 15),
    last_visit:  new Date(Date.now() - rndInt(1, 180) * 86400000).toISOString(),
  }));
  const customers = await knex('customers').insert(custRows).returning('*');
  const custIds   = customers.map(c => c.id);
  console.log(`   ✓ ${customers.length} customers`);

  // ── 7. HISTORICAL SESSIONS — 6 months ────────────────────────────
  const today   = new Date('2026-04-05T00:00:00.000Z');
  const startDt = new Date('2025-10-05T00:00:00.000Z');
  const custSales = new Map();
  let totalOrders = 0;

  for (let d = new Date(startDt); d < today; d.setDate(d.getDate() + 1)) {
    if (Math.random() < 0.27) continue;          // ~73% of days active
    const ds   = d.toISOString().slice(0, 10);
    const op   = rnd(staffPool);
    const hh   = rndInt(8, 9).toString().padStart(2, '0');
    const mm   = rndInt(0, 30).toString().padStart(2, '0');
    const ch   = rndInt(21, 22).toString().padStart(2, '0');
    const cm   = rndInt(0, 59).toString().padStart(2, '0');
    const openedAt = new Date(`${ds}T${hh}:${mm}:00.000Z`);
    const closedAt = new Date(`${ds}T${ch}:${cm}:00.000Z`);

    const [sess] = await knex('sessions').insert({
      pos_config_id: config.id, opened_by: op.id,
      opened_at: openedAt.toISOString(), closed_at: closedAt.toISOString(),
      opening_cash: rndInt(500, 2000), closing_cash: rndInt(3000, 9000),
      status: 'closed',
    }).returning('*');

    const numOrders = rndInt(6, 14);
    for (let o = 0; o < numOrders; o++) {
      const custId = Math.random() < 0.40 ? rnd(custIds) : null;
      const offsetMs = rndInt(20, 720) * 60000;
      const oTime = new Date(Math.min(openedAt.getTime() + offsetMs, closedAt.getTime() - 60000));

      const [order] = await knex('orders').insert({
        session_id: sess.id, table_id: rnd(tableIds), customer_id: custId,
        order_number: o + 1, status: 'paid', notes: rnd(NOTES),
        created_by: rnd(staffPool).id, subtotal: 0, tax_amount: 0, total: 0,
        created_at: oTime.toISOString(), updated_at: oTime.toISOString(),
      }).returning('*');

      const { lines, picked, orderTotal } = await buildOrder(knex, order.id, products, rndInt(2, 6));
      if (custId) custSales.set(custId, (custSales.get(custId) || 0) + orderTotal);
      await finaliseOrder(knex, order, lines, picked, orderTotal, Math.random() < 0.9 ? 'completed' : 'preparing');
      totalOrders++;
    }

    // Staff payment per closed session
    await knex('staff_payments').insert({
      staff_id: op.id, session_id: sess.id, paid_by: admin.id,
      amount: +(+op.hourly_rate * rndInt(6, 10)).toFixed(2),
      note: 'Daily session payment', status: 'paid',
      created_at: closedAt.toISOString(),
    });
  }
  console.log(`   ✓ ${totalOrders} historical orders`);

  // Bulk-update customer total_sales
  for (const [id, total] of custSales)
    await knex('customers').where({ id }).update({ total_sales: total.toFixed(2) });

  // ── 8. TODAY'S OPEN SESSION ───────────────────────────────────────
  const [todaySess] = await knex('sessions').insert({
    pos_config_id: config.id, opened_by: staff1.id,
    opened_at: new Date('2026-04-05T09:00:00.000Z').toISOString(),
    opening_cash: 1000, status: 'open',
  }).returning('*');
  await knex('pos_configs').where({ id: config.id }).update({ last_session_id: todaySess.id });

  // 2 paid + 3 draft orders today
  const todayDefs = [
    { n: 1, status: 'paid',  tid: tableIds[0], notes: null             },
    { n: 2, status: 'paid',  tid: tableIds[1], notes: 'Less spicy please' },
    { n: 3, status: 'draft', tid: tableIds[2], notes: null             },
    { n: 4, status: 'draft', tid: tableIds[3], notes: 'Extra cheese'   },
    { n: 5, status: 'draft', tid: tableIds[4], notes: null             },
  ];
  for (const od of todayDefs) {
    const [order] = await knex('orders').insert({
      session_id: todaySess.id, table_id: od.tid, order_number: od.n,
      status: od.status, notes: od.notes, created_by: staff1.id,
      subtotal: 0, tax_amount: 0, total: 0,
    }).returning('*');
    const { lines, picked, orderTotal } = await buildOrder(knex, order.id, products, rndInt(2, 4));

    if (od.status === 'paid') {
      await knex('payments').insert({ order_id: order.id, method: rnd(METHODS), amount: orderTotal, status: 'confirmed' });
      const [t] = await knex('kitchen_tickets').insert({ order_id: order.id, status: 'completed', sent_at: new Date().toISOString(), completed_at: new Date().toISOString() }).returning('*');
      await knex('kitchen_ticket_items').insert(lines.map((l, i) => ({ ticket_id: t.id, order_line_id: l.id, product_name: picked[i].name, quantity: l.quantity, is_prepared: true })));
    } else {
      const tickStat = rnd(['to_cook', 'preparing']);
      const [t] = await knex('kitchen_tickets').insert({ order_id: order.id, status: tickStat, sent_at: new Date().toISOString() }).returning('*');
      await knex('kitchen_ticket_items').insert(lines.map((l, i) => ({ ticket_id: t.id, order_line_id: l.id, product_name: picked[i].name, quantity: l.quantity, is_prepared: false })));
    }
  }

  console.log(`\n✅ Seed complete!`);
  console.log(`   Products  : ${products.length}`);
  console.log(`   Customers : ${customers.length}`);
  console.log(`   Today session ID : ${todaySess.id}  (status: open)`);
  console.log(`\n   Demo logins:`);
  console.log(`   admin@pos-cafe.com  / Admin@1234`);
  console.log(`   raj@pos-cafe.com    / Staff@1234`);
  console.log(`   arjun@pos-cafe.com  / Kitchen@1234`);
};
