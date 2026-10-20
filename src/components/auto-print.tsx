"use client";
import { useEffect } from "react";
export function AutoPrint() {
  useEffect(() => { const t = setTimeout(() => window.print(), 600); return () => clearTimeout(t); }, []);
  return <button className="no-print btn-primary btn-sm fixed right-4 top-4" onClick={() => window.print()}>Print / Save PDF</button>;
}
