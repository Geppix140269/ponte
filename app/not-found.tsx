import Link from "next/link";
import { BridgeMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <section className="container-px py-20">
      <div className="glass p-12 md:p-16 max-w-2xl mx-auto text-center">
        <BridgeMark className="h-20 w-20 mx-auto" />
        <p
          className="mono text-gold mt-7"
          style={{ fontSize: 64, lineHeight: 1, letterSpacing: "-0.02em" }}
        >
          404
        </p>
        <h1
          className="serif text-ink mt-4"
          style={{ fontSize: 32, fontWeight: 500 }}
        >
          The bridge isn&apos;t there.
        </h1>
        <p className="mt-4 max-w-md mx-auto text-[15px] text-gray-2 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist, or has moved.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row justify-center">
          <Link href="/" className="btn-gold">
            Back to home
          </Link>
          <Link href="/network" className="btn-ghost-light">
            Go to the network
          </Link>
        </div>
      </div>
    </section>
  );
}
