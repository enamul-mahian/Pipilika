import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ChatWidget } from "@/components/chat-widget";
import { Effects } from "@/components/effects";
import { getSettings } from "@/lib/settings";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <>
      <Header />
      <main id="main" className="fx-page min-h-[60vh]">{children}</main>
      <Effects />
      <Footer />
      {s.features.chat && <ChatWidget whatsapp={s.features.whatsapp ? s.store.whatsapp : ""} />}
    </>
  );
}
