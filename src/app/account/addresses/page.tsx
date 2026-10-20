import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AddressBook } from "@/components/account-tools";
export default async function Addresses() {
  const u = (await getUser())!;
  const list = await db.address.findMany({ where: { userId: u.id }, orderBy: { createdAt: "asc" } });
  return <div><h1 className="mb-4 text-3xl">Saved addresses</h1><AddressBook list={list} /></div>;
}
