import ArchPattern from "@/components/ArchPattern";

export default function PageHero({
  label,
  title,
  subtitle,
}: {
  label: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-navy">
      <ArchPattern className="opacity-[0.04]" />
      <div className="container-px relative py-24 sm:py-28 lg:py-32">
        <p className="tag-rule">{label}</p>
        <h1 className="mt-5 max-w-3xl text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
