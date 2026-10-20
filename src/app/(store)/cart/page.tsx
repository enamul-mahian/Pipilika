import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";
export const metadata: Metadata = { title: "Your cart", robots: { index: false } };
export default function CartPage() {
  return <div className="wrap py-8"><h1 className="text-4xl">Your cart</h1><CartView /></div>;
}
