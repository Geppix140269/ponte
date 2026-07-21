import {
  Wheat, Apple, Beef, Fish, Package, Droplets, Wine, Coffee, Boxes,
  Fuel, FlaskConical, Layers, Trees, Shirt, Cog, Cpu, Truck,
  Stethoscope, Armchair, type LucideIcon,
} from "lucide-react";

// Product taxonomy for the marketplace, grouped on HS-code families but
// written in trader language. Users click, never type the product name.
export type TradeCategory = {
  id: string;
  label: string;
  icon: LucideIcon;
  subs: string[];
};

export const TRADE_CATEGORIES: TradeCategory[] = [
  { id: "grains", label: "Grains & Cereals", icon: Wheat, subs: ["Wheat", "Corn / maize", "Rice", "Barley", "Soybeans", "Pulses & lentils", "Seeds", "Flour & milled"] },
  { id: "produce", label: "Fruits & Vegetables", icon: Apple, subs: ["Fresh fruit", "Fresh vegetables", "Frozen", "Dried fruit & nuts"] },
  { id: "meat", label: "Meat & Poultry", icon: Beef, subs: ["Beef", "Poultry", "Pork", "Lamb", "Processed meat"] },
  { id: "seafood", label: "Fish & Seafood", icon: Fish, subs: ["Fresh fish", "Frozen fish", "Shellfish", "Processed seafood"] },
  { id: "dairy", label: "Dairy & Eggs", icon: Package, subs: ["Milk & cream", "Cheese", "Butter", "Milk powder", "Eggs"] },
  { id: "oils", label: "Edible Oils & Fats", icon: Droplets, subs: ["Sunflower oil", "Olive oil", "Palm oil", "Rapeseed oil", "Other oils & fats"] },
  { id: "beverages", label: "Beverages", icon: Wine, subs: ["Wine", "Beer & spirits", "Juices", "Water & soft drinks"] },
  { id: "coffee", label: "Coffee, Tea & Sugar", icon: Coffee, subs: ["Coffee", "Tea", "Cocoa", "Spices", "Sugar & sweeteners"] },
  { id: "foods", label: "Prepared Foods", icon: Boxes, subs: ["Canned & preserved", "Pasta & bakery", "Confectionery", "Sauces & condiments", "Animal feed"] },
  { id: "fuels", label: "Minerals & Fuels", icon: Fuel, subs: ["Refined fuels", "Crude oil", "Coal", "Gas", "Ores & minerals", "Cement & aggregates"] },
  { id: "chemicals", label: "Chemicals & Pharma", icon: FlaskConical, subs: ["Industrial chemicals", "Fertilizers", "Pharmaceuticals", "Cosmetics", "Cleaning products"] },
  { id: "plastics", label: "Plastics & Rubber", icon: Layers, subs: ["Raw polymers", "Plastic products", "Rubber & tyres"] },
  { id: "wood", label: "Wood & Paper", icon: Trees, subs: ["Timber & lumber", "Plywood & panels", "Pellets & biomass", "Paper & packaging"] },
  { id: "textiles", label: "Textiles & Apparel", icon: Shirt, subs: ["Fabrics & yarns", "Clothing", "Home textiles", "Footwear & leather"] },
  { id: "metals", label: "Metals & Steel", icon: Cog, subs: ["Steel & iron", "Aluminium", "Copper", "Scrap metal", "Metal products"] },
  { id: "machinery", label: "Machinery & Electronics", icon: Cpu, subs: ["Industrial machinery", "Agricultural machinery", "Electronics & components", "Appliances"] },
  { id: "vehicles", label: "Vehicles & Transport", icon: Truck, subs: ["Cars & trucks", "Parts & tyres", "Ships & rail"] },
  { id: "medical", label: "Medical & Instruments", icon: Stethoscope, subs: ["Medical devices", "Lab & instruments", "PPE & disposables"] },
  { id: "home", label: "Furniture & Construction", icon: Armchair, subs: ["Furniture", "Building materials", "Glass & ceramics", "Stone & marble"] },
  { id: "other", label: "Other Goods", icon: Package, subs: ["Other"] },
];
