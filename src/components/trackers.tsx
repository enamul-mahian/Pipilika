"use client";
import { useEffect } from "react";
import { track } from "./analytics";

export function ViewTracker({ id, name, price }: { id: string; name: string; price: number }) {
  useEffect(() => track("view_item", { item_id: id, item_name: name, value: price, currency: "BDT" }), [id, name, price]);
  return null;
}
export function SearchTracker({ q }: { q: string }) {
  useEffect(() => track("search", { search_term: q }), [q]);
  return null;
}
export function EventTracker({ name, params }: { name: string; params?: Record<string, unknown> }) {
  useEffect(() => track(name, params), [name]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
