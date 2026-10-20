"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconHeart } from "./icons";

export function WishlistButton({ productId }: { productId: string }) {
  const [on, setOn] = useState(false);
  const router = useRouter();
  return (
    <button
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border ${on ? "border-brand bg-brand text-white" : "border-line bg-white text-brand"}`}
      aria-label="Save to wishlist"
      aria-pressed={on}
      onClick={async () => {
        const r = await fetch("/api/v1/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
        if (r.status === 401) return router.push("/login?next=" + location.pathname);
        const j = await r.json();
        setOn(!!j.saved);
      }}
    >
      <IconHeart className="h-5 w-5" />
    </button>
  );
}
