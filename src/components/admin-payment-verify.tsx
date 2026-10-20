"use client";
import { useRouter } from "next/navigation";
import { api, useAction } from "./ui";

export function PaymentVerify({ id }: { id: string }) {
  const router = useRouter();
  const a = useAction();
  const go = (approve: boolean) => a.run(async () => { await api(`/api/v1/admin/payments/${id}`, { body: { approve, note: approve ? undefined : window.prompt("Reason for rejecting?") ?? undefined } }); router.refresh(); });
  return (
    <span className="flex gap-1">
      <button className="btn-primary btn-sm" disabled={a.busy} onClick={() => go(true)}>Verify</button>
      <button className="btn-outline btn-sm" disabled={a.busy} onClick={() => window.confirm("Reject this payment?") && go(false)}>Reject</button>
      {a.error && <span className="text-xs text-red-700">{a.error}</span>}
    </span>
  );
}
