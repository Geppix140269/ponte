import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import CategoryLinks, { type CategoryLink } from "@/components/ponte/category/CategoryLinks";
import { MARKET_FAMILIES, type MarketFamily } from "@/lib/taxonomy/market";
import { TRADE_SERVICE_CATEGORIES, subcategoriesFor, serviceCategory } from "@/lib/taxonomy/services";
import { DISTRIBUTION_PARTNER_TYPES } from "@/lib/taxonomy/distribution";
import { buildFindHref, type FindQuery } from "@/lib/find/query";

/**
 * Find, opened on categories rather than on a text field.
 *
 * Products always had a route in: tap a category, tap a product. Trade services
 * and Distribution had none. Find required a product before it would show
 * anything, and neither of those families has one, so a member looking for a
 * customs broker or a distributor for the Italian market had nowhere to start.
 * That is the same defect the composer had, seen from the other side: without
 * structured categories a market can be neither described nor searched.
 *
 * Every step here is a link, so the whole journey works without JavaScript, can
 * be shared, opened in a new tab and indexed, and every category is a real URL
 * rather than a transient client state.
 */

export default async function FindCategoryEntry({ q }: { q: FindQuery }) {
  const t = await getTranslations("find");

  if (!q.family) return <FamilyChoice />;
  if (q.family === "services") return <ServiceChoice q={q} />;
  if (q.family === "distribution") return <PartnerChoice q={q} />;
  return null;

  async function FamilyChoice() {
    const description: Record<MarketFamily, string> = {
      products: t("family.products"),
      services: t("family.services"),
      distribution: t("family.distribution"),
    };
    const items: CategoryLink[] = MARKET_FAMILIES.map((family) => ({
      key: family.key,
      label: family.label,
      description: description[family.key],
      icon: family.icon,
      href: buildFindHref({ family: family.key }),
    }));

    return (
      <section className="fphead" aria-label={t("family.title")} style={{ borderBottom: "none" }}>
        <Head eyebrow={t("family.eyebrow")} title={t("family.title")} lead={t("family.lead")} />
        <CategoryLinks items={items} legend={t("family.legend")} />
      </section>
    );
  }

  async function ServiceChoice({ q: query }: { q: FindQuery }) {
    // No category chosen: the eleven top-level categories.
    if (!query.serviceCategory) {
      const items: CategoryLink[] = TRADE_SERVICE_CATEGORIES.map((category) => ({
        key: category.key,
        label: category.label,
        description: category.description,
        icon: category.icon,
        isOther: category.isOther,
        href: buildFindHref({ family: "services", serviceCategory: category.key }),
      }));
      return (
        <section className="fphead" aria-label={t("family.servicesTitle")} style={{ borderBottom: "none" }}>
          <Head
            eyebrow={t("family.eyebrow")}
            title={t("family.servicesTitle")}
            lead={t("family.servicesLead")}
          />
          <Crumbs>
            <Link className="fctx__edit" href={buildFindHref({})}>
              {t("family.changeMarket")}
            </Link>
          </Crumbs>
          <CategoryLinks items={items} legend={t("family.servicesTitle")} />
        </section>
      );
    }

    // A category is chosen, so the subcategories are offered as a further
    // narrowing. They are an option, never a gate: "everything in freight and
    // logistics" is a legitimate search and it is the first entry in the list.
    const category = serviceCategory(query.serviceCategory);
    const everything: CategoryLink = {
      key: "__all",
      label: t("family.allIn", { category: category?.label ?? "" }),
      current: query.serviceSubcategory === null,
      href: buildFindHref({ family: "services", serviceCategory: query.serviceCategory }),
    };
    const items: CategoryLink[] = subcategoriesFor(query.serviceCategory).map((sub) => ({
      key: sub.key,
      label: sub.label,
      isOther: sub.isOther,
      current: query.serviceSubcategory === sub.key,
      href: buildFindHref({
        family: "services",
        serviceCategory: query.serviceCategory,
        serviceSubcategory: sub.key,
        territory: query.territory,
      }),
    }));

    // The crumb and the change control are the results header's job. Repeating
    // them here printed the same category twice on one screen, and nesting a
    // grid inside the crumb row squeezed it into a single column of the page.
    return (
      <CategoryLinks
        dense
        items={[everything].concat(items)}
        legend={t("family.subcategoryLegend", { category: category?.label ?? "" })}
      />
    );
  }

  async function PartnerChoice({ q: query }: { q: FindQuery }) {
    // A chosen partner type has nothing further to narrow by: the results
    // header already names it and offers the way back.
    if (query.partnerType) return null;

    const items: CategoryLink[] = DISTRIBUTION_PARTNER_TYPES.map((type) => ({
      key: type.key,
      label: type.label,
      description: type.description,
      icon: type.icon,
      isOther: type.isOther,
      href: buildFindHref({ family: "distribution", partnerType: type.key }),
    }));

    return (
      <section
        className="fphead"
        aria-label={t("family.distributionTitle")}
        style={{ borderBottom: "none" }}
      >
        <Head
          eyebrow={t("family.eyebrow")}
          title={t("family.distributionTitle")}
          lead={t("family.distributionLead")}
        />
        <Crumbs>
          <Link className="fctx__edit" href={buildFindHref({})}>
            {t("family.changeMarket")}
          </Link>
        </Crumbs>
        <CategoryLinks items={items} legend={t("family.distributionTitle")} />
      </section>
    );
  }
}

function Head({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  return (
    <>
      <div className="fphead__eb">
        <span className="fphead__rule" aria-hidden="true" />
        <span className="eyebrow">{eyebrow}</span>
      </div>
      <h1 className="fphead__h serif">{title}</h1>
      <p className="fphead__def">{lead}</p>
    </>
  );
}

function Crumbs({ children }: { children: React.ReactNode }) {
  return <div className="fctx">{children}</div>;
}
