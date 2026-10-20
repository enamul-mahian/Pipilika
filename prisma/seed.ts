/* Realistic demo data for Pipilika. Run: npm run db:seed  (safe to re-run: it wipes demo tables first) */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { DEFAULT_ROLES } from "../src/lib/permissions";
import { ledger } from "../src/lib/ledger";

const db = new PrismaClient();
const tok = () => crypto.randomBytes(16).toString("hex");
const daysAgo = (d: number, h = 12) => { const x = new Date(); x.setDate(x.getDate() - d); x.setHours(h, 0, 0, 0); return x; };
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function wipe() {
  // order matters for FKs
  const tables = [
    "LedgerEntry", "Voucher", "LedgerAccount", "DailyCashClosing", "Message", "Conversation", "CannedReply", "Notification", "Review", "Wishlist",
    "CouponRedemption", "Coupon", "Refund", "Payment", "PriceAdjustment", "Quote", "CustomDesign", "OrderEvent", "OrderItem", "Order",
    "StockMovement", "PurchaseItem", "Purchase", "SupplierPayment", "Supplier", "InventoryItem", "Expense",
    "ModifierOption", "ModifierGroup", "ProductVariant", "ProductImage", "Product", "Category",
    "CakeBasePrice", "CakeBase", "CakeWeight", "CakeOption", "GalleryItem", "DeliveryZone",
    "Page", "Setting", "AuditLog", "AnalyticsEvent", "Address", "LoginEvent", "OtpCode", "User", "Role", "Subscriber",
  ];
  for (const t of tables) await db.$executeRawUnsafe(`DELETE FROM "${t}"`);
}

async function main() {
  await wipe();

  // ---------- Roles & users ----------
  const roles: Record<string, string> = {};
  for (const [name, permissions] of Object.entries(DEFAULT_ROLES)) {
    const r = await db.role.create({ data: { name, permissions, isSystem: true } });
    roles[name] = r.id;
  }
  const pw = await bcrypt.hash("Pipilika@2026", 12);
  const owner = await db.user.create({ data: { kind: "STAFF", name: "Roksana Naznin", email: "owner@thepipilika.com", passwordHash: pw, roleId: roles.Owner } });
  const seller = await db.user.create({ data: { kind: "STAFF", name: "Sumi Akter", email: "seller@thepipilika.com", passwordHash: pw, roleId: roles["Seller / POS"] } });
  await db.user.create({ data: { kind: "STAFF", name: "Karim Hossain", email: "accounts@thepipilika.com", passwordHash: pw, roleId: roles.Accounts } });
  const cust = await db.user.create({ data: { kind: "CUSTOMER", name: "Nusrat Jahan", phone: "01711111111", phoneVerified: new Date(), email: "nusrat@example.com", birthday: "1995-06-14" } });
  const cust2 = await db.user.create({ data: { kind: "CUSTOMER", name: "Tanvir Ahmed", phone: "01822222222", phoneVerified: new Date() } });
  await db.address.create({ data: { userId: cust.id, label: "Home", name: "Nusrat Jahan", phone: "01711111111", line: "House 12, Road 5", area: "Dhanmondi", city: "Dhaka", isDefault: true } });

  // ---------- Catalog ----------
  const catDefs = [
    ["Cakes", "/demo/chocolate-truffle.jpg"], ["Pastries", "/demo/pastries.jpg"], ["Patis", "/demo/pastries.jpg"], ["Cookies", "/demo/cookies.jpg"],
    ["Cupcakes", "/demo/cupcakes.jpg"], ["Brownies", "/demo/brownies.jpg"], ["Donuts", "/demo/donuts.jpg"], ["Bread & Sandwich", "/demo/cheesecake.jpg"],
  ];
  const cats: Record<string, string> = {};
  for (const [i, [name, image]] of catDefs.entries()) cats[name] = (await db.category.create({ data: { name, slug: slug(name.split(" ")[0]), image, sortOrder: i } })).id;

  type PDef = { name: string; cat: string; price: number; img: string[]; desc: string; featured?: boolean; type?: "FIXED" | "CUSTOM"; stock?: number | null; mto?: boolean; rating?: [number, number]; sold?: number; compareAt?: number; variants?: [string, number, number?][]; tags?: string[] };
  const P: PDef[] = [
    { name: "Chocolate Truffle Cake", cat: "Cakes", price: 1200, img: ["/demo/chocolate-truffle.jpg"], desc: "Rich Belgian chocolate sponge layered with silky truffle ganache and topped with fresh strawberries.", featured: true, mto: true, rating: [4.9, 120], sold: 410, variants: [["500g", 650, 500], ["1 kg", 1200, 1000], ["1.5 kg", 1750, 1500], ["2 kg", 2300, 2000]], tags: ["chocolate", "birthday"] },
    { name: "Red Velvet Cake", cat: "Cakes", price: 1150, img: ["/demo/red-velvet.jpg"], desc: "Classic red velvet with cream cheese frosting and berries.", featured: true, mto: true, rating: [4.8, 98], sold: 350, variants: [["500g", 620, 500], ["1 kg", 1150, 1000], ["2 kg", 2200, 2000]], tags: ["red velvet"] },
    { name: "Chocolate Chip Cookies", cat: "Cookies", price: 250, img: ["/demo/cookies.jpg"], desc: "Box of 6 buttery, chewy cookies loaded with chocolate chips.", featured: true, stock: 40, rating: [4.9, 265], sold: 900 },
    { name: "Blueberry Cheesecake", cat: "Cakes", price: 850, img: ["/demo/cheesecake.jpg"], desc: "Creamy baked cheesecake with a buttery biscuit base and blueberry compote. 6-inch.", featured: true, stock: 8, rating: [4.9, 76], sold: 180 },
    { name: "Cupcakes (box of 6)", cat: "Cupcakes", price: 650, img: ["/demo/cupcakes.jpg"], desc: "Six vanilla cupcakes with strawberry buttercream swirls and sprinkles.", featured: true, stock: 20, rating: [4.9, 143], sold: 300, compareAt: 720 },
    { name: "Assorted Pastries", cat: "Pastries", price: 680, img: ["/demo/pastries.jpg"], desc: "Box of 6 pastries: opera, strawberry, chocolate and vanilla slices.", featured: true, stock: 15, rating: [4.8, 92], sold: 260 },
    { name: "Fudgy Brownies", cat: "Brownies", price: 350, img: ["/demo/brownies.jpg"], desc: "Box of 4 dense, fudgy brownies with a crackly top.", featured: true, stock: 30, rating: [4.9, 188], sold: 520 },
    { name: "Donuts (box of 4)", cat: "Donuts", price: 480, img: ["/demo/donuts.jpg"], desc: "Four glazed donuts with pink icing and sprinkles.", featured: true, stock: 25, rating: [4.7, 64], sold: 210 },
    { name: "Black Forest Cake", cat: "Cakes", price: 1100, img: ["/demo/chocolate-truffle.jpg"], desc: "Chocolate sponge, whipped cream and cherries.", mto: true, rating: [4.7, 40], sold: 120, variants: [["1 kg", 1100, 1000], ["2 kg", 2100, 2000]] },
    { name: "Strawberry Pastry", cat: "Pastries", price: 140, img: ["/demo/pastries.jpg"], desc: "Single slice of fresh strawberry cream pastry.", stock: 50, rating: [4.6, 33], sold: 140 },
    { name: "Butter Cookies Tin", cat: "Cookies", price: 550, img: ["/demo/cookies.jpg"], desc: "500g tin of classic Danish-style butter cookies. Great for gifting.", stock: 12, sold: 45 },
    { name: "Club Sandwich", cat: "Bread & Sandwich", price: 220, img: ["/demo/pastries.jpg"], desc: "Triple-decker chicken club sandwich with fries.", stock: null, mto: true, sold: 80 },
    { name: "Milk Bread Loaf", cat: "Bread & Sandwich", price: 120, img: ["/demo/cheesecake.jpg"], desc: "Soft, fluffy milk bread baked fresh every morning.", stock: 18, sold: 300 },
    { name: "Custom Celebration Cake", cat: "Cakes", price: 1400, img: ["/demo/cake-ayan.jpg", "/demo/cake-spider.jpg"], desc: "Your own design — photo print, theme toppers and custom message. Price by weight; final price confirmed by our team.", type: "CUSTOM", mto: true, rating: [5, 51], sold: 230, variants: [["1 kg", 1400, 1000], ["1.5 kg", 2000, 1500], ["2 kg", 2600, 2000], ["3 kg", 3800, 3000]], tags: ["custom", "birthday", "photo"] },
  ];
  const prodIds: Record<string, string> = {};
  for (const p of P) {
    const created = await db.product.create({
      data: {
        name: p.name, slug: slug(p.name), description: p.desc, type: p.type ?? "FIXED", categoryId: cats[p.cat], basePrice: p.price, compareAt: p.compareAt,
        stock: p.stock === undefined ? (p.mto ? null : 20) : p.stock, madeToOrder: !!p.mto, isFeatured: !!p.featured, ratingAvg: p.rating?.[0] ?? 0, ratingCount: p.rating?.[1] ?? 0,
        soldCount: p.sold ?? 0, tags: p.tags ?? [], images: { create: p.img.map((url, i) => ({ url, sort: i, alt: p.name })) },
        variants: p.variants ? { create: p.variants.map(([name, price, g], i) => ({ name, price, weightG: g, sort: i })) } : undefined,
      },
    });
    prodIds[p.name] = created.id;
  }
  // Cake flavour + message modifiers
  for (const name of ["Chocolate Truffle Cake", "Red Velvet Cake", "Custom Celebration Cake"]) {
    await db.modifierGroup.create({ data: { productId: prodIds[name], name: "Message on cake", type: "TEXT", sort: 2 } });
    await db.modifierGroup.create({ data: { productId: prodIds[name], name: "Add-ons", type: "MULTI", sort: 3, options: { create: [{ name: "Candles & knife", priceDelta: 50 }, { name: "Greeting card", priceDelta: 60 }, { name: "Fresh flowers", priceDelta: 250 }] } } });
  }
  await db.modifierGroup.create({ data: { productId: prodIds["Custom Celebration Cake"], name: "Flavour", type: "SINGLE", required: true, sort: 1, options: { create: [{ name: "Vanilla", priceDelta: 0, isDefault: true }, { name: "Chocolate", priceDelta: 100 }, { name: "Red Velvet", priceDelta: 200 }, { name: "Black Forest", priceDelta: 150 }] } } });
  // Patis with the universal modifier engine
  const patis = await db.product.create({
    data: { name: "Patis (Bakery Pattie)", slug: "patis", description: "Flaky, buttery puff pastry with your choice of filling. Made fresh to order.", categoryId: cats.Patis, basePrice: 60, madeToOrder: true, minQty: 2, isFeatured: false, ratingAvg: 4.8, ratingCount: 57, soldCount: 640, images: { create: [{ url: "/demo/pastries.jpg", alt: "Patis" }] } },
  });
  prodIds.Patis = patis.id;
  await db.modifierGroup.create({ data: { productId: patis.id, name: "Size", type: "SINGLE", required: true, sort: 0, options: { create: [{ name: "Regular", priceDelta: 0, isDefault: true }, { name: "Large", priceDelta: 25 }] } } });
  await db.modifierGroup.create({ data: { productId: patis.id, name: "Filling", type: "SINGLE", required: true, sort: 1, options: { create: [{ name: "Chicken", priceDelta: 20, sort: 0 }, { name: "Beef", priceDelta: 30, sort: 1 }, { name: "Vegetable", priceDelta: 0, sort: 2, rules: { excludes: ["Egg"] } }, { name: "Papaya", priceDelta: 0, sort: 3 }, { name: "Chocolate", priceDelta: 15, sort: 4, rules: { excludes: ["Onion", "Spicy"] } }] } } });
  await db.modifierGroup.create({ data: { productId: patis.id, name: "Onion", type: "BOOLEAN", sort: 2, options: { create: [{ name: "Onion", priceDelta: 0 }] } } });
  await db.modifierGroup.create({ data: { productId: patis.id, name: "Extras", type: "MULTI", sort: 3, maxSelect: 3, options: { create: [{ name: "Cheese", priceDelta: 15 }, { name: "Extra filling", priceDelta: 20 }, { name: "Egg", priceDelta: 10 }, { name: "Spicy", priceDelta: 0 }] } } });
  await db.modifierGroup.create({ data: { productId: patis.id, name: "Sauce", type: "QUANTITY", sort: 4, options: { create: [{ name: "Tomato sauce cup", priceDelta: 5 }, { name: "Garlic mayo cup", priceDelta: 10 }] } } });

  // ---------- Cake builder ----------
  const weights = [[250, "250 g"], [500, "500 g"], [750, "750 g"], [1000, "1 kg"], [1500, "1.5 kg"], [2000, "2 kg"], [3000, "3 kg"]] as const;
  for (const [i, [g, l]] of weights.entries()) await db.cakeWeight.create({ data: { grams: g, label: l, sort: i } });
  const baseDefs: [string, number][] = [["Vanilla", 1000], ["Chocolate", 1150], ["Red Velvet", 1300], ["Black Forest", 1200], ["Butterscotch", 1150], ["Coffee Mocha", 1250]];
  for (const [i, [name, perKg]] of baseDefs.entries()) {
    const b = await db.cakeBase.create({ data: { name, sort: i } });
    for (const [g] of weights) {
      const factor = g === 250 ? 1.25 : g === 500 ? 1.1 : g <= 1000 ? 1.0 : 0.95; // small cakes cost more per kg
      await db.cakeBasePrice.create({ data: { baseId: b.id, grams: g, price: Math.round(((perKg * g) / 1000) * factor / 10) * 10 } });
    }
  }
  const opts: [string, string, number, any?][] = [
    ["FILLING", "Classic cream", 0], ["FILLING", "Chocolate ganache", 150, { perKg: true }], ["FILLING", "Strawberry", 120, { perKg: true }], ["FILLING", "Mango", 150, { perKg: true }], ["FILLING", "Nutella", 250, { perKg: true }], ["FILLING", "Cream cheese", 200, { perKg: true }],
    ["DECORATION", "Rosette piping", 150], ["DECORATION", "Fresh flowers", 350], ["DECORATION", "Gold leaf accents", 300], ["DECORATION", "Chocolate drip", 200], ["DECORATION", "Macarons on top", 400], ["DECORATION", "Fondant figurine", 600],
    ["PRINT", "Cake topper (printed)", 250, { printType: "TOPPER" }], ["PRINT", "Sugar paper print", 300, { printType: "SUGAR" }], ["PRINT", "Waffle paper print", 200, { printType: "WAFFLE" }],
    ["BOARD", "Standard board", 0], ["BOARD", "Premium gold board", 150], ["BOARD", "Wooden display board", 400],
    ["EXTRA", "Candles & knife", 50], ["EXTRA", "Sparkler candles", 120], ["EXTRA", "Greeting card", 60], ["EXTRA", "Gift box upgrade", 200],
    ["SHAPE", "Standard shape (round/square)", 0, { category: "standard" }], ["SHAPE", "Shaped cake", 300, { category: "shaped" }], ["SHAPE", "Number cake", 400, { category: "number" }], ["SHAPE", "Letter cake", 400, { category: "letter" }], ["SHAPE", "Complex custom shape", 700, { category: "custom" }],
  ];
  for (const [i, [kind, name, price, meta]] of opts.entries()) await db.cakeOption.create({ data: { kind, name, price, meta, sort: i } });

  const gallery: [string, string, string, number, number][] = [
    ["Happy Birthday Ayan", "/demo/cake-ayan.jpg", "Photo print cake with rosettes", 1000, 1550],
    ["Signature Rose Cake", "/demo/cake-spider.jpg", "Pink rosettes with gold logo topper", 1500, 2200],
    ["Happy Birthday Gold Script", "/demo/cake-birthday-girl.jpg", "Gold script topper with fresh roses", 1000, 1600],
    ["Chocolate Drip Celebration", "/demo/chocolate-truffle.jpg", "Drip cake with fresh strawberries", 1000, 1500],
    ["Red Velvet Berry", "/demo/red-velvet.jpg", "Naked red velvet with berries", 1000, 1400],
    ["Blueberry Dream", "/demo/cheesecake.jpg", "Cheesecake-style celebration cake", 750, 1100],
  ];
  for (const [i, [title, image, description, minWeightG, startPrice]] of gallery.entries()) await db.galleryItem.create({ data: { title, image, description, minWeightG, startPrice, sort: i, tags: ["birthday"] } });

  // ---------- Delivery & coupons ----------
  for (const [i, [name, charge]] of ([["Dhanmondi / Mohammadpur", 60], ["Gulshan / Banani / Baridhara", 100], ["Mirpur / Uttara", 120], ["Old Dhaka / Motijheel", 100], ["Outside Dhaka (courier)", 250]] as const).entries())
    await db.deliveryZone.create({ data: { name, charge, sort: i } });
  await db.coupon.createMany({ data: [
    { code: "WELCOME10", description: "10% off your first order (max ৳300)", type: "PERCENT", value: 10, maxDiscount: 300, perUserLimit: 1 },
    { code: "FREEDEL", description: "Free delivery on orders over ৳1,500", type: "FREE_DELIVERY", minOrder: 1500 },
    { code: "CAKE200", description: "৳200 off any cake over ৳2,000", type: "FIXED", value: 200, minOrder: 2000, categoryIds: [cats.Cakes], usageLimit: 100, endsAt: daysAgo(-60) },
    { code: "EID2025", description: "Old Eid offer", type: "PERCENT", value: 15, endsAt: daysAgo(200), isActive: true },
  ] });

  // ---------- Inventory, suppliers, purchases ----------
  const inv: [string, string, number, number, number][] = [
    ["Flour (maida)", "kg", 80, 25, 70], ["Sugar", "kg", 45, 20, 120], ["Butter", "kg", 12, 8, 950], ["Whipping cream", "litre", 6, 10, 520], ["Dark chocolate", "kg", 9, 5, 1100],
    ["Eggs", "pcs", 300, 120, 12], ["Chicken filling", "kg", 7, 5, 480], ["Cake boxes (1 kg)", "pcs", 140, 50, 35], ["Cake boards", "pcs", 90, 40, 25], ["Sugar paper sheets", "pcs", 18, 20, 60],
  ];
  const items: Record<string, string> = {};
  for (const [name, unit, stock, reorderLevel, costPerUnit] of inv) items[name] = (await db.inventoryItem.create({ data: { name, unit, stock, reorderLevel, costPerUnit } })).id;
  const sup1 = await db.supplier.create({ data: { name: "Dhaka Flour Mills", phone: "01911000000", address: "Tejgaon, Dhaka" } });
  const sup2 = await db.supplier.create({ data: { name: "Fresh Dairy BD", phone: "01922000000", address: "Mirpur, Dhaka" } });
  async function purchase(s: { id: string; name: string }, lines: [string, number, number][], paid: number, method: string, d: number) {
    const total = lines.reduce((a, [, q, c]) => a + Math.round(q * c), 0);
    await db.$transaction(async (tx) => {
      const p = await tx.purchase.create({ data: { supplierId: s.id, invoiceNo: "INV-" + crypto.randomInt(1000, 9999), date: daysAgo(d), total, paid, due: total - paid, method, byId: owner.id, createdAt: daysAgo(d), items: { create: lines.map(([n, qty, unitCost]) => ({ itemId: items[n], qty, unitCost, total: Math.round(qty * unitCost) })) } } });
      for (const [n, qty] of lines) await tx.stockMovement.create({ data: { itemId: items[n], type: "IN", qty, refType: "purchase", refId: p.id, note: "Purchase", createdAt: daysAgo(d) } });
      await ledger.purchase(tx, { total, supplierId: s.id, purchaseId: p.id, supplierName: s.name, byId: owner.id });
      if (paid > 0) {
        const sp = await tx.supplierPayment.create({ data: { supplierId: s.id, purchaseId: p.id, amount: paid, method, byId: owner.id, createdAt: daysAgo(d) } });
        await ledger.supplierPayment(tx, { amount: paid, method, supplierId: s.id, supplierName: s.name, refId: sp.id, byId: owner.id });
      }
      await tx.supplier.update({ where: { id: s.id }, data: { due: { increment: total - paid } } });
    });
  }
  await purchase(sup1, [["Flour (maida)", 100, 70], ["Sugar", 60, 120]], 8000, "CASH", 9); // 14,200 total -> 6,200 due
  await purchase(sup2, [["Butter", 10, 950], ["Whipping cream", 12, 520]], 0, "CASH", 5); // 15,740 due
  await purchase(sup1, [["Eggs", 360, 12], ["Cake boxes (1 kg)", 100, 35]], 7820, "CASH", 2); // fully paid

  // ---------- Expenses ----------
  for (const [cat, amount, method, d, note] of [["Rent", 25000, "BANK", 20, "October shop rent"], ["Salaries", 42000, "BANK", 3, "Staff salaries"], ["Utilities", 6200, "CASH", 6, "Electricity + gas"], ["Marketing", 5000, "CASH", 4, "Facebook ads"], ["Delivery", 1800, "CASH", 1, "Rider fuel"], ["Packaging", 2400, "CASH", 7, "Ribbons & tape"]] as [string, number, string, number, string][]) {
    await db.$transaction(async (tx) => {
      const e = await tx.expense.create({ data: { category: cat, amount, method, note, date: daysAgo(d), byId: owner.id } });
      await ledger.expense(tx, { amount, method, category: cat, expenseId: e.id, note, byId: owner.id });
    });
  }
  // owner capital so cash isn't negative
  await db.$transaction(async (tx) => {
    const { postVoucher } = await import("../src/lib/ledger");
    await postVoucher(tx, { type: "JOURNAL", narration: "Opening capital", byId: owner.id }, [{ account: "CASH", debit: 60000 }, { account: "BANK", debit: 150000 }, { account: "CAPITAL", credit: 210000 }]);
  });

  // ---------- Orders ----------
  let n = 0;
  const statuses = ["DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "OUT_FOR_DELIVERY", "PREPARING", "CONFIRMED", "PLACED", "DELIVERED", "CANCELLED"];
  const prodList = Object.entries(prodIds).filter(([k]) => !["Custom Celebration Cake", "Patis"].includes(k));
  for (let d = 13; d >= 0; d--) {
    const perDay = 2 + ((d * 7) % 4);
    for (let k = 0; k < perDay; k++) {
      n++;
      const [pname, pid] = prodList[(d * 3 + k) % prodList.length];
      const prod = await db.product.findUniqueOrThrow({ where: { id: pid }, include: { variants: true, images: { take: 1 } } });
      const v = prod.variants[k % Math.max(1, prod.variants.length)];
      const qty = 1 + (k % 2);
      const unit = v?.price ?? prod.basePrice;
      const isPos = k % 3 === 0;
      const delivery = isPos ? 0 : 60 + (k % 3) * 20;
      const total = unit * qty + delivery;
      const status = d === 0 ? ["PLACED", "CONFIRMED", "PREPARING"][k % 3] : statuses[(d + k) % statuses.length];
      const who = k % 4 === 1 ? cust : k % 4 === 2 ? cust2 : null;
      const method = isPos ? (k % 2 ? "CASH" : "BKASH") : ["BKASH", "COD", "NAGAD", "BANK"][k % 4];
      const paid = status === "CANCELLED" ? 0 : status === "DELIVERED" || isPos ? total : method === "COD" ? 0 : total;
      const created = daysAgo(d, 10 + k);
      await db.$transaction(async (tx) => {
        const o = await tx.order.create({
          data: {
            code: `PC-${10000 + n}${n % 10}`, shareToken: tok(), userId: who?.id, customerName: who?.name ?? ["Farhana Islam", "Rafiq Uddin", "Maliha Chowdhury", "Sabbir Khan"][n % 4], phone: who?.phone ?? `0171${String(1000000 + n * 7919).slice(-7)}`,
            channel: isPos ? "POS" : "WEB", status: isPos ? "DELIVERED" : status, fulfillment: isPos ? "PICKUP" : "DELIVERY", address: isPos ? null : "Road 7, Dhanmondi, Dhaka", zoneName: isPos ? null : "Dhanmondi / Mohammadpur",
            subtotal: unit * qty, deliveryCharge: delivery, total, paidAmount: paid, paymentStatus: paid >= total ? "PAID" : paid ? "PARTIALLY_PAID" : "PENDING", paymentMethod: method,
            source: ["facebook", "google", "instagram", null][n % 4], createdById: isPos ? seller.id : null, createdAt: created,
            items: { create: [{ productId: pid, name: pname, variant: v?.name, image: prod.images[0]?.url, unitPrice: unit, qty, lineTotal: unit * qty }] },
            events: { create: [{ status: "PLACED", createdAt: created }, ...(status !== "PLACED" ? [{ status: isPos ? "DELIVERED" : status, createdAt: created }] : [])] },
          },
        });
        if (paid > 0) {
          await tx.payment.create({ data: { orderId: o.id, method, amount: paid, status: "PAID", trxId: method === "CASH" ? null : "TX" + crypto.randomInt(1e7, 1e8), verifiedById: seller.id, verifiedAt: created, createdAt: created } });
          await ledger.saleReceipt(tx, { amount: paid, method, orderCode: o.code, orderId: o.id, byId: seller.id });
        }
      });
    }
  }
  // pending verification payment
  const pend = await db.order.create({ data: { code: "PC-109991", shareToken: tok(), userId: cust.id, customerName: cust.name, phone: cust.phone!, status: "PLACED", fulfillment: "DELIVERY", address: "House 12, Road 5, Dhanmondi", zoneName: "Dhanmondi / Mohammadpur", subtotal: 1300, deliveryCharge: 60, total: 1360, paymentStatus: "VERIFICATION_REQUIRED", paymentMethod: "BKASH", items: { create: [{ productId: prodIds["Fudgy Brownies"], name: "Fudgy Brownies", unitPrice: 350, qty: 2, lineTotal: 700, image: "/demo/brownies.jpg" }, { productId: prodIds["Strawberry Pastry"], name: "Strawberry Pastry", unitPrice: 150, qty: 4, lineTotal: 600, image: "/demo/pastries.jpg" }] }, events: { create: [{ status: "PLACED" }] } } });
  await db.payment.create({ data: { orderId: pend.id, method: "BKASH", amount: 1360, trxId: "BK8F3K2L9Q", status: "VERIFICATION_REQUIRED" } });

  // custom orders in different workflow stages
  const base = await db.cakeBase.findFirstOrThrow({ where: { name: "Chocolate" } });
  const customDefs = [
    { code: "PC-100281", status: "QUOTE_SENT", title: "Happy Birthday Ayan", img: "/demo/cake-ayan.jpg", grams: 1000, est: 1550, quote: 1550, user: cust },
    { code: "PC-100250", status: "DESIGN_SUBMITTED", title: "Signature rose cake", img: "/demo/cake-spider.jpg", grams: 2000, est: 2650, user: cust2 },
    { code: "PC-100231", status: "BAKING", title: "Gold script birthday cake", img: "/demo/cake-birthday-girl.jpg", grams: 1500, est: 2100, quote: 2200, user: null, advance: 1100 },
  ];
  for (const c of customDefs) {
    await db.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: { code: c.code, shareToken: tok(), type: "CUSTOM", status: c.status, userId: c.user?.id, customerName: c.user?.name ?? "Sharmin Sultana", phone: c.user?.phone ?? "01733333333", fulfillment: "DELIVERY", address: "Gulshan 2, Dhaka", zoneName: "Gulshan / Banani / Baridhara", deliveryCharge: 100, subtotal: c.quote ?? c.est, total: (c.quote ?? c.est) + 100, estimatedWeightG: c.grams, quotedPrice: c.quote, paidAmount: c.advance ?? 0, paymentStatus: c.advance ? "PARTIALLY_PAID" : "PENDING", deliveryDate: daysAgo(-3, 17), items: { create: [{ name: `Custom cake — ${c.title}`, unitPrice: c.quote ?? c.est, qty: 1, lineTotal: c.quote ?? c.est, image: c.img }] }, events: { create: [{ status: "DESIGN_SUBMITTED" }, ...(c.status !== "DESIGN_SUBMITTED" ? [{ status: c.status }] : [])] } },
      });
      await tx.customDesign.create({ data: { orderId: o.id, userId: c.user?.id, title: `${c.title} · Chocolate · ${c.grams / 1000} kg`, data: { v: 1, summary: `${c.title} · Chocolate · ${c.grams / 1000} kg`, baseId: base.id, grams: c.grams, shape: { kind: "preset", preset: "round", widthIn: 8, heightIn: 8 }, printType: "SUGAR" }, printType: "SUGAR", printSizeIn: 6, estimatedPrice: c.est, minWeightG: c.grams } });
      if (c.quote) await tx.quote.create({ data: { orderId: o.id, amount: c.quote, advanceRequired: Math.round(c.quote / 2), note: "Includes edible sugar-paper photo print and rosette border.", status: c.status === "QUOTE_SENT" ? "SENT" : "APPROVED", estimatedReadyAt: daysAgo(-3, 15), createdById: seller.id } });
      if (c.advance) {
        await tx.payment.create({ data: { orderId: o.id, method: "BKASH", kind: "ADVANCE", amount: c.advance, status: "PAID", trxId: "BKADV" + crypto.randomInt(1000, 9999), verifiedById: seller.id, verifiedAt: new Date() } });
        await ledger.saleReceipt(tx, { amount: c.advance, method: "BKASH", orderCode: o.code, orderId: o.id, byId: seller.id });
      }
    });
  }

  // ---------- Reviews ----------
  const revs: [string, string, number, string][] = [
    ["Chocolate Truffle Cake", "Farhana I.", 5, "Absolutely divine! The ganache was so smooth and everyone at the party loved it."],
    ["Red Velvet Cake", "Rafiq U.", 5, "Best red velvet in Dhaka. Moist and not too sweet."],
    ["Fudgy Brownies", "Maliha C.", 5, "Fudgy, chocolatey perfection. Ordering again!"],
    ["Custom Celebration Cake", "Nusrat J.", 5, "They printed my son's photo perfectly. The cake looked exactly like the preview!"],
    ["Patis", "Sabbir K.", 4, "Crispy and loaded with chicken. Great evening snack."],
  ];
  for (const [p, name, rating, comment] of revs) await db.review.create({ data: { productId: prodIds[p], name, rating, comment, isVerified: true, userId: name.startsWith("Nusrat") ? cust.id : null } });

  // ---------- Chats ----------
  const conv = await db.conversation.create({ data: { customerId: cust.id, orderId: (await db.order.findUnique({ where: { code: "PC-100281" } }))?.id, status: "WAITING", lastMessageAt: daysAgo(0, 9) } });
  await db.message.createMany({ data: [
    { conversationId: conv.id, senderType: "CUSTOMER", senderId: cust.id, senderName: cust.name, body: "Hi! Can you make the Ayan cake with blue rosettes instead of pink?", createdAt: daysAgo(0, 8) },
    { conversationId: conv.id, senderType: "STAFF", senderId: seller.id, senderName: seller.name, body: "Of course! Blue rosettes are no extra charge. I've sent you the updated quote.", createdAt: daysAgo(0, 9) },
  ] });
  const conv2 = await db.conversation.create({ data: { guestName: "Rumana", guestPhone: "01744444444", guestToken: tok(), status: "OPEN", lastMessageAt: new Date() } });
  await db.message.create({ data: { conversationId: conv2.id, senderType: "CUSTOMER", senderName: "Rumana", body: "Do you deliver to Uttara on Friday evening?" } });
  await db.cannedReply.createMany({ data: [
    { title: "Greeting", body: "Hi! Thanks for reaching out to Pipilika 🎂 How can I help you today?" },
    { title: "Payment instructions", body: "Please send the advance to bKash Merchant 01700-000000 and share the TrxID here. We start baking once it's verified." },
    { title: "Custom cake lead time", body: "Custom cakes need at least 48 hours. Tiered/wedding cakes need 5 days." },
    { title: "Delivery areas", body: "We deliver all over Dhaka. Charges: Dhanmondi ৳60, Gulshan/Banani ৳100, Mirpur/Uttara ৳120." },
  ] });

  // ---------- CMS pages ----------
  const id = () => crypto.randomBytes(4).toString("hex");
  const pages: { slug: string; title: string; blocks: any[]; showInMenu?: boolean; seoTitle?: string; seoDesc?: string }[] = [
    {
      slug: "home", title: "Home", seoTitle: "Pipilika — Custom Cakes & Bakery in Dhaka",
      blocks: [
        { id: id(), type: "hero", props: { eyebrow: "Freshly baked · Premium ingredients · Made with love", title: "Custom Cakes for Every", highlight: "Special Moment", subtitle: "Birthdays, anniversaries, weddings or just because. Turn your ideas into delicious memories with Pipilika.", image: "/demo/hero.jpg", primaryLabel: "Order Custom Cake", primaryHref: "/custom-cake", secondaryLabel: "Browse Products", secondaryHref: "/shop", features: "Home delivery across Bangladesh\nPremium quality ingredients\n100% customizable designs\nFreshly baked with love" } },
        { id: id(), type: "products", props: { title: "Featured Products", subtitle: "Freshly baked delights for every celebration", source: "featured", limit: 8 } },
        { id: id(), type: "customCake", props: { title: "Design your dream cake in a few clicks", text: "Upload a photo (optional), pick a shape — even numbers, letters or your own outline — choose flavour and size, add your message and see a live preview with instant price.", image: "/demo/cake-ayan.jpg", cta: "Start designing" } },
        { id: id(), type: "categories", props: { title: "Shop by category" } },
        { id: id(), type: "gallery", props: { title: "Cakes we've made", limit: 6 } },
        { id: id(), type: "products", props: { title: "Best sellers", subtitle: "Our customers' favourites", source: "best", limit: 4 } },
        { id: id(), type: "testimonials", props: { title: "Loved by our customers", limit: 3 } },
        { id: id(), type: "features", props: { items: "Custom cakes|for every occasion\nWide range|of baked goodies\nFast & safe|delivery across BD\nPremium quality|ingredients\nLoved by|thousands of customers" } },
      ],
    },
    { slug: "about", title: "About Pipilika", showInMenu: true, seoDesc: "Pipilika is a homemade premium bakery in Dhaka founded by Roksana Naznin.", blocks: [
      { id: id(), type: "text", props: { title: "Our story", body: "Pipilika (পিপীলিকা — the ant) began in Roksana Naznin's home kitchen with one simple belief: life is sweeter with a little cake.\n\nLike the hard-working ant, we put patience and care into every layer. Today we bake custom celebration cakes, pastries, cookies and savoury treats for thousands of families across Dhaka — still by hand, still with premium ingredients." } },
      { id: id(), type: "image", props: { image: "/demo/hero-banner.jpg", title: "Made with love in Dhaka", text: "", href: "/shop" } },
      { id: id(), type: "features", props: { items: "Homemade|small-batch baking\nPremium|butter, cream & chocolate\nCustom|designs for every story\nOn time|delivery across Dhaka" } },
    ] },
    { slug: "contact", title: "Contact us", showInMenu: true, blocks: [{ id: id(), type: "contact", props: { title: "We'd love to hear from you", text: "Questions about an order or a custom design? Call, WhatsApp or use the chat button." } }] },
    { slug: "faq", title: "FAQ", blocks: [{ id: id(), type: "faq", props: { title: "Frequently asked questions", items: "How early should I order a custom cake?|At least 48 hours for most designs, 5 days for tiered or wedding cakes.\nDo I have to upload a photo?|No. You can design with text only, pick a gallery design, choose a theme topper, or send the photo later on WhatsApp.\nHow does payment work for custom cakes?|We review your design and send a quote. After you approve, pay the advance (usually 50%) by bKash, Nagad, Bangla QR or bank transfer. The rest is paid on delivery.\nWill the cake look exactly like the preview?|The preview is an approximation. Real cream, colours and baking can vary slightly, but our decorators follow your design closely.\nDo you deliver outside Dhaka?|Yes, selected items by courier. Fresh-cream cakes are Dhaka only." } }] },
    { slug: "policies", title: "Policies", blocks: [{ id: id(), type: "text", props: { title: "Ordering, delivery & refunds", body: "Orders: Ready-made items are confirmed instantly. Custom cakes are confirmed once you approve the quote and the advance is verified.\n\nChanges & cancellations: Free changes up to 24 hours before delivery. Custom cake advances are non-refundable once baking starts.\n\nDelivery: We deliver within Dhaka between 10am and 10pm. Please keep your phone reachable.\n\nRefunds: If something is wrong with your order, contact us within 2 hours of delivery with photos and we'll make it right.\n\nPrivacy: We only collect what we need to process your orders (name, phone, address). We never sell your data. You can delete your account anytime from your profile." } }] },
    { slug: "offers", title: "Offers", blocks: [{ id: id(), type: "offers", props: { title: "Current offers" } }, { id: id(), type: "products", props: { title: "On sale & popular", source: "best", limit: 4 } }] },
  ];
  for (const p of pages) await db.page.create({ data: { slug: p.slug, title: p.title, blocks: p.blocks, publishedBlocks: p.blocks, isPublished: true, publishedAt: new Date(), isSystem: ["home"].includes(p.slug), showInMenu: !!p.showInMenu, seoTitle: p.seoTitle, seoDesc: p.seoDesc } });

  // notifications for customer
  await db.notification.create({ data: { userId: cust.id, title: "Quote Sent", body: "Quote for PC-100281: ৳1,550. Please review and approve.", link: "/account/orders" } });

  console.log("Seed complete.\nOwner login: owner@thepipilika.com / Pipilika@2026\nSeller: seller@thepipilika.com / Pipilika@2026\nCustomer OTP login: 01711111111");
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
