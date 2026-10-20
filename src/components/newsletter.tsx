"use client";
import { api, useAction } from "./ui";
import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const a = useAction();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        a.run(() => api("/api/v1/newsletter", { body: { email } }).then(() => setEmail("")), "Subscribed — thank you!");
      }}
    >
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" aria-label="Email" className="input !bg-white text-ink" />
      <button className="btn-primary shrink-0" disabled={a.busy}>Subscribe</button>
      <span className="sr-only" aria-live="polite">{a.msg || a.error}</span>
      {(a.msg || a.error) && <p className="absolute mt-12 text-xs text-gold">{a.msg || a.error}</p>}
    </form>
  );
}
