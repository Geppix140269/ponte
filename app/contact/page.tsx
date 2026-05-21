import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Let's discuss your next move. Reach Ponte's offices in the United Kingdom and Bulgaria, or send us a message.",
};

const offices = [
  {
    country: "United Kingdom",
    company: "Ponte (1402 Celsius Ltd)",
    lines: ["20–22 Wenlock Road", "London, N1 7GU"],
    reg: "Reg. No: 12475013",
    vat: "VAT: GB 343 1702 32",
  },
  {
    country: "Bulgaria",
    company: "Ponte (1402 Celsius Ltd)",
    lines: ["1A Aton Street, Building 6", "Plovdiv, 4002"],
    reg: "Reg. No: 207314767",
    vat: "VAT: BG 207314767",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        label="Get in Touch"
        title="Let's discuss your next move"
        subtitle="Whether you're entering a new market or sourcing across borders, our team is ready to help."
      />

      <section className="section bg-white">
        <div className="container-px grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Form */}
          <div>
            <p className="section-label">Send a Message</p>
            <h2 className="mb-8 mt-4 text-2xl sm:text-3xl">
              Tell us about your enquiry
            </h2>
            <ContactForm />
          </div>

          {/* Offices */}
          <div>
            <p className="section-label">Our Offices</p>
            <h2 className="mt-4 text-2xl sm:text-3xl">Where to find us</h2>

            <div className="mt-8 space-y-8">
              {offices.map((office) => (
                <div
                  key={office.country}
                  className="border-l-2 border-gold bg-cream p-6"
                >
                  <h3 className="text-lg">{office.country}</h3>
                  <p className="mt-2 text-sm text-navy">{office.company}</p>
                  <address className="mt-1 text-sm not-italic leading-relaxed text-gray">
                    {office.lines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                  <p className="mt-3 text-xs text-gray">
                    {office.reg}
                    <span className="mx-2 text-navy/30">|</span>
                    {office.vat}
                  </p>
                </div>
              ))}

              <div className="border-t border-navy/10 pt-6">
                <p className="text-sm text-gray">
                  <span className="font-medium text-navy">Phone:</span>{" "}
                  <a
                    href="tel:+442081231402"
                    className="transition-colors hover:text-gold"
                  >
                    +44 208 123 1402
                  </a>
                </p>
                <p className="mt-2 text-sm text-gray">
                  <span className="font-medium text-navy">Email:</span>{" "}
                  <a
                    href="mailto:info@ponte.trade"
                    className="transition-colors hover:text-gold"
                  >
                    info@ponte.trade
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
