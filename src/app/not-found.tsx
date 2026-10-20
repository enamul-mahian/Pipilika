import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center bg-cream px-4 text-center">
      <div>
        <p className="font-script text-3xl text-brand">Oops!</p>
        <h1 className="text-4xl">This page is not on the menu</h1>
        <p className="mt-2 text-muted">The page you are looking for doesn&apos;t exist or was moved.</p>
        <div className="mt-6 flex justify-center gap-3"><Link href="/" className="btn-primary">Go home</Link><Link href="/shop" className="btn-outline">Browse cakes</Link></div>
      </div>
    </div>
  );
}
