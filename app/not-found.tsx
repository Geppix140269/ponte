import Link from "next/link";

export default function NotFound() {
  return (
    <section className="bg-navy">
      <div className="container-px flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-5 text-5xl font-extrabold text-white sm:text-6xl">
          Page not found
        </h1>
        <p className="mt-5 max-w-md text-lg text-white/70">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="btn-gold">Back to home</Link>
          <Link href="/catalogue" className="btn-ghost-light">Browse the Catalogue</Link>
        </div>
      </div>
    </section>
  );
}
