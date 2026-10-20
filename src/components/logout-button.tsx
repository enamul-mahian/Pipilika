"use client";
export function LogoutButton({ className = "" }: { className?: string }) {
  return (
    <button className={className} onClick={async () => { await fetch("/api/v1/auth/logout", { method: "POST" }); location.href = "/"; }}>
      Log out
    </button>
  );
}
