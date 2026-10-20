// Granular permissions. Owner gets "*".
export const PERMISSIONS = {
  "dashboard.view": "View dashboard",
  "products.manage": "Manage products, categories, modifiers, gallery",
  "cake.manage": "Manage cake builder pricing",
  "orders.view": "View orders",
  "orders.manage": "Update orders, quotes, final prices",
  "payments.verify": "Verify payments & refunds",
  "pos.use": "Use POS",
  "customers.view": "View customers/CRM",
  "coupons.manage": "Manage coupons & delivery zones",
  "inventory.manage": "Inventory, suppliers, purchases",
  "accounts.manage": "Expenses, ledger, cash closing",
  "reports.view": "View reports",
  "chat.use": "Customer chat",
  "reviews.manage": "Moderate reviews",
  "site.manage": "Site editor, SEO, settings, feature flags",
  "staff.manage": "Staff, roles, audit log",
} as const;
export type Permission = keyof typeof PERMISSIONS;

export const DEFAULT_ROLES: Record<string, string[]> = {
  Owner: ["*"],
  Admin: Object.keys(PERMISSIONS).filter((p) => p !== "staff.manage"),
  "Seller / POS": ["dashboard.view", "pos.use", "orders.view", "orders.manage", "customers.view", "chat.use", "payments.verify"],
  Accounts: ["dashboard.view", "accounts.manage", "inventory.manage", "reports.view", "payments.verify", "orders.view"],
  Production: ["orders.view", "inventory.manage"],
  Delivery: ["orders.view"],
};

export const can = (perms: string[] | undefined | null, p: Permission) =>
  !!perms && (perms.includes("*") || perms.includes(p));
