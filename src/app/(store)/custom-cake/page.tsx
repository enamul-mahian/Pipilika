import type { Metadata } from "next";
import { CakeDesigner } from "@/components/cake-designer";
import { loadDesignerConfig } from "@/lib/cake-config";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Custom Cake Designer — design your cake online",
  description: "Upload a photo or pick a design, choose shape, flavour, weight and board, add your message and get an instant estimated price.",
  alternates: { canonical: "/custom-cake" },
};

export default async function CustomCakePage({ searchParams }: { searchParams: Promise<{ gallery?: string }> }) {
  const sp = await searchParams;
  const [cfg, user] = await Promise.all([loadDesignerConfig(), getUser()]);
  return (
    <div className="wrap py-8">
      <p className="font-script text-2xl text-brand">Custom Cake Designer</p>
      <h1 className="text-4xl">Design your dream cake</h1>
      <p className="mt-1 text-muted">A few clicks — live preview and instant estimated price.</p>
      <div className="mt-6">
        <CakeDesigner config={cfg} initialGalleryId={sp.gallery} loggedIn={!!user} user={user ? { name: user.name, phone: user.phone ?? "" } : null} />
      </div>
    </div>
  );
}
