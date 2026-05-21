import Link from "next/link";
import ArchPattern from "@/components/ArchPattern";

export default function NotFound() {
  return (
    <section className="relative flex min-h-[calc(100vh-5rem)] items-center overflow-hidden bg-navy">
      <ArchPattern className="opacity-[0.04]" />
      <div className="container-px relative py-20 text-center">
        <p className="section-label">Error 404</p>
        <h1 className="mt-6 font-serif text-6xl text-white sm:text-7xl">
          Page not found
        </h1>
        <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-white/70">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
          Let&apos;s get you back on track.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/" className="btn-gold">
            Back to Home
          </Link>
          <Link href="/contact" className="btn-outline-light">
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  );
}
