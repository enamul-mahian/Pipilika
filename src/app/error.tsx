"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <h1 className="text-3xl">Something went wrong</h1>
        <p className="mt-2 text-muted">Please try again. If it keeps happening, contact us on WhatsApp.</p>
        <button className="btn-primary mt-5" onClick={reset}>Try again</button>
      </div>
    </div>
  );
}
