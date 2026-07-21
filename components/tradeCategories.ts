import {
  Wheat, Apple, Beef, Fish, Package, Droplets, Wine, Coffee, Boxes,
  Fuel, FlaskConical, Layers, Trees, Shirt, Cog, Cpu, Truck,
  Stethoscope, Armchair, type LucideIcon,
} from "lucide-react";

// Product taxonomy for the marketplace, grouped on HS-code families but
// written in trader language. Users click, never type the product name.
//
// This is a plain data module, so it holds no hooks and no human copy. Every
// visible label lives in the "categories" message namespace and is resolved
// by the consuming component with useTranslations("categories").
//
// The `value` strings below are written to Supabase as part of the product
// line. They are identifiers, not copy: never edit them, never translate
// them. Only `labelKey` decides what a trader reads on screen.

export type TradeSubcategory = {
  /** Persisted to the database. Stable identifier, never translated. */
  value: string;
  /** Key inside the "categories" namespace, for example "grains.subs.wheat". */
  labelKey: string;
};

export type TradeCategory = {
  /** Persisted to the database on the listing row. Stable identifier. */
  id: string;
  /** Persisted to the database inside the product line. Stable identifier. */
  value: string;
  /** Key inside the "categories" namespace, for example "grains.label". */
  labelKey: string;
  icon: LucideIcon;
  subs: TradeSubcategory[];
};

// Builder: keeps the table readable and derives every message key from the
// category id, so keys and data can never drift apart.
function category(
  id: string,
  value: string,
  icon: LucideIcon,
  subs: Array<[key: string, value: string]>,
): TradeCategory {
  return {
    id,
    value,
    labelKey: `${id}.label`,
    icon,
    subs: subs.map(([key, subValue]) => ({
      value: subValue,
      labelKey: `${id}.subs.${key}`,
    })),
  };
}

export const TRADE_CATEGORIES: TradeCategory[] = [
  category("grains", "Grains & Cereals", Wheat, [
    ["wheat", "Wheat"],
    ["corn", "Corn / maize"],
    ["rice", "Rice"],
    ["barley", "Barley"],
    ["soybeans", "Soybeans"],
    ["pulses", "Pulses & lentils"],
    ["seeds", "Seeds"],
    ["flour", "Flour & milled"],
  ]),
  category("produce", "Fruits & Vegetables", Apple, [
    ["freshFruit", "Fresh fruit"],
    ["freshVegetables", "Fresh vegetables"],
    ["frozen", "Frozen"],
    ["driedFruitNuts", "Dried fruit & nuts"],
  ]),
  category("meat", "Meat & Poultry", Beef, [
    ["beef", "Beef"],
    ["poultry", "Poultry"],
    ["pork", "Pork"],
    ["lamb", "Lamb"],
    ["processed", "Processed meat"],
  ]),
  category("seafood", "Fish & Seafood", Fish, [
    ["freshFish", "Fresh fish"],
    ["frozenFish", "Frozen fish"],
    ["shellfish", "Shellfish"],
    ["processed", "Processed seafood"],
  ]),
  category("dairy", "Dairy & Eggs", Package, [
    ["milkCream", "Milk & cream"],
    ["cheese", "Cheese"],
    ["butter", "Butter"],
    ["milkPowder", "Milk powder"],
    ["eggs", "Eggs"],
  ]),
  category("oils", "Edible Oils & Fats", Droplets, [
    ["sunflower", "Sunflower oil"],
    ["olive", "Olive oil"],
    ["palm", "Palm oil"],
    ["rapeseed", "Rapeseed oil"],
    ["other", "Other oils & fats"],
  ]),
  category("beverages", "Beverages", Wine, [
    ["wine", "Wine"],
    ["beerSpirits", "Beer & spirits"],
    ["juices", "Juices"],
    ["waterSoftDrinks", "Water & soft drinks"],
  ]),
  category("coffee", "Coffee, Tea & Sugar", Coffee, [
    ["coffee", "Coffee"],
    ["tea", "Tea"],
    ["cocoa", "Cocoa"],
    ["spices", "Spices"],
    ["sugar", "Sugar & sweeteners"],
  ]),
  category("foods", "Prepared Foods", Boxes, [
    ["canned", "Canned & preserved"],
    ["pastaBakery", "Pasta & bakery"],
    ["confectionery", "Confectionery"],
    ["sauces", "Sauces & condiments"],
    ["animalFeed", "Animal feed"],
  ]),
  category("fuels", "Minerals & Fuels", Fuel, [
    ["refined", "Refined fuels"],
    ["crude", "Crude oil"],
    ["coal", "Coal"],
    ["gas", "Gas"],
    ["ores", "Ores & minerals"],
    ["cement", "Cement & aggregates"],
  ]),
  category("chemicals", "Chemicals & Pharma", FlaskConical, [
    ["industrial", "Industrial chemicals"],
    ["fertilizers", "Fertilizers"],
    ["pharmaceuticals", "Pharmaceuticals"],
    ["cosmetics", "Cosmetics"],
    ["cleaning", "Cleaning products"],
  ]),
  category("plastics", "Plastics & Rubber", Layers, [
    ["polymers", "Raw polymers"],
    ["products", "Plastic products"],
    ["rubberTyres", "Rubber & tyres"],
  ]),
  category("wood", "Wood & Paper", Trees, [
    ["timber", "Timber & lumber"],
    ["plywood", "Plywood & panels"],
    ["pellets", "Pellets & biomass"],
    ["paper", "Paper & packaging"],
  ]),
  category("textiles", "Textiles & Apparel", Shirt, [
    ["fabrics", "Fabrics & yarns"],
    ["clothing", "Clothing"],
    ["home", "Home textiles"],
    ["footwear", "Footwear & leather"],
  ]),
  category("metals", "Metals & Steel", Cog, [
    ["steel", "Steel & iron"],
    ["aluminium", "Aluminium"],
    ["copper", "Copper"],
    ["scrap", "Scrap metal"],
    ["products", "Metal products"],
  ]),
  category("machinery", "Machinery & Electronics", Cpu, [
    ["industrial", "Industrial machinery"],
    ["agricultural", "Agricultural machinery"],
    ["electronics", "Electronics & components"],
    ["appliances", "Appliances"],
  ]),
  category("vehicles", "Vehicles & Transport", Truck, [
    ["carsTrucks", "Cars & trucks"],
    ["parts", "Parts & tyres"],
    ["shipsRail", "Ships & rail"],
  ]),
  category("medical", "Medical & Instruments", Stethoscope, [
    ["devices", "Medical devices"],
    ["lab", "Lab & instruments"],
    ["ppe", "PPE & disposables"],
  ]),
  category("home", "Furniture & Construction", Armchair, [
    ["furniture", "Furniture"],
    ["building", "Building materials"],
    ["glass", "Glass & ceramics"],
    ["stone", "Stone & marble"],
  ]),
  category("other", "Other Goods", Package, [
    ["other", "Other"],
  ]),
];

// Helpers for any consumer that stores or reads the raw values. Each returns
// a key for the "categories" namespace, to be passed to
// useTranslations("categories") in a component or getTranslations on the
// server. Nothing here calls a hook.

/** Find a category by its stored id. */
export function findCategory(id: string): TradeCategory | undefined {
  return TRADE_CATEGORIES.find((c) => c.id === id);
}

/** Message key for a stored category id. Undefined if the id is unknown. */
export function categoryLabelKey(id: string): string | undefined {
  return findCategory(id)?.labelKey;
}

/** Message key for a stored sub-category value. Undefined if unknown. */
export function subcategoryLabelKey(
  categoryId: string,
  subValue: string,
): string | undefined {
  return findCategory(categoryId)?.subs.find((s) => s.value === subValue)
    ?.labelKey;
}
