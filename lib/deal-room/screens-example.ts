import { formatRoomMoment } from "./moment";
import {
  PERIOD_CALENDAR_DAYS,
  ADDITIONAL_BRANCH_PRICE_CENTS,
  BASE_ROOM_PRICE_CENTS,
  CURRENCY,
  INCLUDED_ACTIVE_BRANCHES,
  MAXIMUM_ROOM_PERIOD_PRICE_CENTS,
} from "./pricing";

/**
 * Content for Deal Room screens 2, 3 and 4.
 *
 * Transcribed from `ponte-draft-data.js` in the owner's design project, which
 * supports `Ponte Deal Room - Four New Screens v1.html`.
 *
 * ## Every organisation and application below is an example
 *
 * Constitution section 5 forbids manufactured activity, so the three
 * applications, their registry numbers and their stated volumes are the design
 * package's own illustrations and are labelled as examples wherever they are
 * shown. None is a real member, and no count on these screens is a real count.
 *
 * ## Prices are read, never typed
 *
 * Every figure comes from `pricing.ts`. A screen that quotes a number the
 * product does not charge is worse than a screen with no number on it.
 */

function money(cents: number, currency: string): string {
  const symbol = currency.toLowerCase() === "usd" ? "$" : "";
  return `${symbol}${cents % 100 === 0 ? cents / 100 : (cents / 100).toFixed(2)}`;
}

/** The illustrative room's activation instant. An example, and labelled as one
 *  everywhere it is drawn: 1 August 2026, 14:32 UTC. */
const EXAMPLE_ACTIVATION_INSTANT = new Date("2026-08-01T14:32:00Z");

const ROOM = money(BASE_ROOM_PRICE_CENTS, CURRENCY);
const BRANCH = money(ADDITIONAL_BRANCH_PRICE_CENTS, CURRENCY);
const CEILING = money(MAXIMUM_ROOM_PERIOD_PRICE_CENTS, CURRENCY);

/* ------------------------------------------------------------------ */
/* Screen 2: activation                                                */
/* ------------------------------------------------------------------ */

export const ACTIVATION = {
  kicker: "Activation",
  head: "Your Deal Room is ready.",
  body:
    "Activate it to invite counterparties, open private negotiations and begin protected commercial progression. Full functionality remains available for 30 calendar days from activation.",
  price: `${ROOM} USD`,
  period: `for ${PERIOD_CALENDAR_DAYS} calendar days`,
  /**
   * The non-disclosure statement (P1-3), beside the price and above the
   * control.
   *
   * Required because the interface said "publish" for this action until 2
   * August 2026, and publish means make publicly visible. A member who read
   * that could reasonably have concluded that paying makes their confidential
   * deal public, which is the exact opposite of the product. Correcting the
   * verb is necessary and is not sufficient: anybody who saw the old wording
   * carries the old expectation, so the correction is stated positively at the
   * moment the money is asked for.
   *
   * It sits next to the figure and BEFORE the payment control, not in the
   * "what does not change" list at the foot of the screen, because a
   * reassurance below the button is a reassurance read after the decision.
   */
  privacy:
    "Activating does not make this room public. Its contents stay visible only to admitted participants.",
  /**
   * When the period ends, in words, before any amount is taken.
   *
   * A member is entitled to know the exact instant they are buying to, not to
   * be handed a duration and left to do the arithmetic. The live screen
   * computes this from `periodEndFrom(activationInstant)` in the member's own
   * timezone; the example below is the design package's illustrative room, and
   * is labelled as an example everywhere it is drawn.
   */
  expiry: {
    label: "Full functionality until",
    /*
      Formatted by the one formatter, not written out here.

      P1-3 requires a date, a time AND a zone on every Deal Room expiry
      display, so that a buyer in Hamburg and a seller in Singapore cannot read
      the same deadline differently. Producing that shape by hand in an example
      is how the example and the product drift apart, so this runs the real
      `formatRoomMoment` over the illustrative room's own activation instant.

      The zone is fixed here because this is a DRAWING of the screen inside the
      walkthrough, and a drawing that changed with the reader's location would
      make the example unreproducible. The live screen passes the viewer's own
      IANA zone, which is the whole point of the rule.
    */
    value:
      formatRoomMoment(EXAMPLE_ACTIVATION_INSTANT, "Europe/Rome")?.full ?? "",
    note: `Counted as ${PERIOD_CALENDAR_DAYS} calendar days from the moment you activate. The clock does not pause.`,
  },
  included: [
    `Up to ${INCLUDED_ACTIVE_BRANCHES} active private counterparty branches`,
    "All five supported languages, including right-to-left Arabic",
    "The full procedure, evidence, decision and blocker record",
    "Read-only preservation of everything after the period ends",
  ],
  /** The ledger. Subordinate to the headline, and legible. */
  ledger: [
    {
      what: "Additional active branch",
      why: `Charged only when a ${INCLUDED_ACTIVE_BRANCHES + 1}th branch is opened in the period`,
      amount: `${BRANCH} USD`,
    },
    {
      what: "Ceiling for this room, this period",
      why: "You are never charged more than this, whatever you open",
      amount: `${CEILING} USD`,
    },
    {
      what: "Invited counterparties",
      why: "They are never asked to pay",
      amount: "No charge",
    },
    { what: "Total today", why: "One charge, now", amount: `${ROOM} USD` },
  ],
  /**
   * The visibility choice.
   *
   * "Open" never stands alone: ADR-0028 is explicit that the word wrongly
   * implies anybody can walk in, and the card says in its own words that
   * nobody enters by applying.
   */
  choice: [
    {
      id: "discoverable",
      title: "Discoverable, open to applications",
      isDefault: true,
      body:
        "Qualified Ponte members see an approved showroom preview of this room and can apply to open a private branch. You review every application and decide who is admitted.",
      detail: "Nobody enters by applying. An application is a request you accept, clarify or decline.",
    },
    {
      id: "private",
      title: "Private, invitation only",
      isDefault: false,
      body:
        "Only the organisations you invite can begin admission. The room does not appear in discovery and cannot be applied to.",
      detail: "You can change this at any point during the period, in either direction.",
    },
  ],
  confirm: `I am authorising a charge of ${ROOM} USD to activate this Deal Room for ${PERIOD_CALENDAR_DAYS} calendar days.`,
  confirmSub:
    "Activation is a deliberate act. Ponte will not charge this account on any other trigger, and no amount is taken before you confirm here.",
} as const;

/* ------------------------------------------------------------------ */
/* Screen 3: the counterparty preview and the five languages           */
/* ------------------------------------------------------------------ */

export interface PreviewLanguage {
  code: string;
  name: string;
  dir: "ltr" | "rtl";
  lang: string;
  kicker: string;
  published: string;
  title: string;
  by: string;
  facts: [string, string][];
  stage: string;
  stageValue: string;
  evidence: string;
  evidenceValue: string;
  cta: string;
  note: string;
}

export const PREVIEW_LANGUAGES: PreviewLanguage[] = [
  {
    code: "EN", name: "English", dir: "ltr", lang: "en",
    kicker: "Deal Room preview", published: "Published 28 July 2026",
    title: "Organic extra virgin olive oil, supply, 24 t per quarter",
    by: "Mediterranea Foods S.L. · Jaén, Spain",
    facts: [["Product", "Organic extra virgin olive oil"], ["Quantity", "24 t per quarter"], ["Origin", "Jaén, Spain"], ["Destination", "Open, not yet agreed"]],
    stage: "Room in preparation", stageValue: "No procedure agreed yet",
    evidence: "Evidence", evidenceValue: "2 items, both accompanied by provenance",
    cta: "Apply to open a private branch",
    note: "You are seeing the approved showroom preview. Applying does not grant access.",
  },
  {
    code: "ES", name: "Español", dir: "ltr", lang: "es",
    kicker: "Vista previa de la Sala de Operación", published: "Publicado el 28 de julio de 2026",
    title: "Aceite de oliva virgen extra ecológico, suministro, 24 t por trimestre",
    by: "Mediterranea Foods S.L. · Jaén, España",
    facts: [["Producto", "Aceite de oliva virgen extra ecológico"], ["Cantidad", "24 t por trimestre"], ["Origen", "Jaén, España"], ["Destino", "Abierto, aún sin acordar"]],
    stage: "Sala en preparación", stageValue: "Aún no se ha acordado ningún procedimiento",
    evidence: "Pruebas", evidenceValue: "2 elementos, ambos con su procedencia",
    cta: "Solicitar la apertura de una rama privada",
    note: "Está viendo la vista previa aprobada. Solicitar no concede acceso.",
  },
  {
    code: "RU", name: "Русский", dir: "ltr", lang: "ru",
    kicker: "Предварительный просмотр сделочной комнаты", published: "Опубликовано 28 июля 2026 г.",
    title: "Органическое оливковое масло первого отжима, поставка, 24 т в квартал",
    by: "Mediterranea Foods S.L. · Хаэн, Испания",
    facts: [["Товар", "Органическое оливковое масло первого отжима"], ["Количество", "24 т в квартал"], ["Происхождение", "Хаэн, Испания"], ["Назначение", "Открыто, пока не согласовано"]],
    stage: "Комната в подготовке", stageValue: "Процедура ещё не согласована",
    evidence: "Доказательства", evidenceValue: "2 элемента, оба с указанием происхождения",
    cta: "Подать заявку на открытие закрытой ветви",
    note: "Вы видите утверждённый предварительный просмотр. Заявка не даёт доступа.",
  },
  {
    code: "ZH", name: "简体中文", dir: "ltr", lang: "zh",
    kicker: "交易室预览", published: "发布于 2026 年 7 月 28 日",
    title: "有机特级初榨橄榄油，供应，每季度 24 吨",
    by: "Mediterranea Foods S.L. · 西班牙哈恩",
    facts: [["产品", "有机特级初榨橄榄油"], ["数量", "每季度 24 吨"], ["原产地", "西班牙哈恩"], ["目的地", "待定，尚未商定"]],
    stage: "交易室筹备中", stageValue: "尚未商定程序",
    evidence: "证据", evidenceValue: "2 项，均附有来源说明",
    cta: "申请开设私密分支",
    note: "您看到的是经批准的展示预览。提交申请并不授予访问权限。",
  },
  {
    code: "AR", name: "العربية", dir: "rtl", lang: "ar",
    kicker: "معاينة غرفة الصفقة", published: "نُشر في ٢٨ يوليو ٢٠٢٦",
    title: "زيت زيتون بكر ممتاز عضوي، توريد، ٢٤ طنًا كل ربع سنة",
    by: "Mediterranea Foods S.L. · خاين، إسبانيا",
    facts: [["المنتج", "زيت زيتون بكر ممتاز عضوي"], ["الكمية", "٢٤ طنًا كل ربع سنة"], ["المنشأ", "خاين، إسبانيا"], ["الوجهة", "مفتوحة، لم يُتفق عليها بعد"]],
    stage: "الغرفة قيد الإعداد", stageValue: "لم يُتفق على أي إجراء بعد",
    evidence: "الأدلة", evidenceValue: "عنصران، لكل منهما بيان مصدره",
    cta: "تقديم طلب لفتح فرع خاص",
    note: "أنت تشاهد المعاينة المعتمدة. تقديم الطلب لا يمنح حق الوصول.",
  },
];

/** A stated list of six, never an implication. */
export const STAYS_PRIVATE: [string, string][] = [
  ["Other private branches", "Their content, their participants, and the fact that they exist."],
  ["Other counterparties", "Who else is in the room, how many there are, or that anybody else was approached."],
  ["Your internal workspace", "Pricing work, scheduling, and any note made inside your own organisation."],
  ["Unpublished evidence", "Every item stays invisible until you publish it into the room or into a branch."],
  ["Your direct contact details", "Email, telephone and messaging routes are never shown. Contact happens inside the room."],
  ["Application activity", "How many members applied, who was declined, and whether the room is near its branch limit."],
];

/* ------------------------------------------------------------------ */
/* Screen 4: the request-to-join inbox                                 */
/* ------------------------------------------------------------------ */

/**
 * An identity fact.
 *
 * `on` confirmed, `declared` stated by the member, `no` not established. Six
 * separate lines and never one combined "Verified" badge: ADR-0027 is explicit
 * that these states must stay specific, and the two that look strongest sit
 * next to their own limit on purpose.
 */
export type IdentityState = "on" | "declared" | "no";

export interface JoinApplication {
  ref: string;
  organisation: string;
  place: string;
  age: string;
  identity: { state: IdentityState; label: string; detail: string }[];
  summary: { label: string; value: string; wide?: boolean }[];
  asked?: { on: string; questions: string[] };
}

export const JOIN_APPLICATIONS: JoinApplication[] = [
  {
    ref: "RQ-114", organisation: "Nordwind Import GmbH", place: "Hamburg, Germany", age: "Received 2 days ago",
    identity: [
      { state: "on", label: "Email confirmed", detail: "11 July 2026" },
      { state: "on", label: "Telephone confirmed", detail: "11 July 2026" },
      { state: "on", label: "Business information supplied", detail: "HRB 118442, Hamburg" },
      { state: "on", label: "Business registry match completed", detail: "Handelsregister · 11 July 2026" },
      { state: "declared", label: "Commercial authority declared", detail: "Head of procurement, declared by the member" },
      { state: "no", label: "Commercial authority not independently verified", detail: "Ponte has not confirmed this with the organisation" },
    ],
    summary: [
      { label: "Role in the proposed transaction", value: "Principal" },
      { label: "Capacity", value: "Buyer, importing on own account" },
      { label: "Organisation", value: "Nordwind Import GmbH" },
      { label: "Preferred language", value: "German, working in English" },
      { label: "What they want to discuss", value: "Quarterly supply of organic EVOO for a private-label retail programme, first contract year 2027.", wide: true },
      { label: "Quantity, capacity or scope", value: "20 to 28 t per quarter; annual retail volume in the same category declared at 400 t." },
      { label: "Origin, destination or territory", value: "Destination Germany; distribution in Germany and Austria." },
      { label: "Timing", value: "First shipment window January to March 2027." },
      { label: "Delivery and payment basis", value: "Seeking CIF Hamburg; payment terms to be agreed in the procedure." },
      { label: "Relevant capability", value: "Existing private-label programmes with two German retail groups, declared." },
      { label: "Evidence categories available", value: "Company registration · authority to represent · trade references." },
    ],
  },
  {
    ref: "RQ-118", organisation: "Cormorant Trading S.A.", place: "Casablanca, Morocco", age: "Received 4 hours ago",
    identity: [
      { state: "on", label: "Email confirmed", detail: "1 August 2026" },
      { state: "no", label: "Telephone confirmed", detail: "Not yet confirmed" },
      { state: "on", label: "Business information supplied", detail: "RC 284119, Casablanca" },
      { state: "no", label: "Business registry match completed", detail: "Not completed, registry not reachable for this jurisdiction" },
      { state: "declared", label: "Commercial authority declared", detail: "Director, declared by the member" },
      { state: "no", label: "Commercial authority not independently verified", detail: "Ponte has not confirmed this with the organisation" },
    ],
    summary: [
      { label: "Role in the proposed transaction", value: "Intermediary" },
      { label: "Capacity", value: "Acting for a named buyer, not disclosed at application" },
      { label: "Organisation", value: "Cormorant Trading S.A." },
      { label: "Preferred language", value: "French, working in English" },
      { label: "What they want to discuss", value: "Availability and price basis for a single trial container before any term arrangement.", wide: true },
      { label: "Quantity, capacity or scope", value: "One container, approximately 18 t." },
      { label: "Origin, destination or territory", value: "Not stated." },
      { label: "Timing", value: "As soon as available." },
      { label: "Delivery and payment basis", value: "Not stated." },
      { label: "Relevant capability", value: "Not stated." },
      { label: "Evidence categories available", value: "Company registration only." },
    ],
  },
  {
    ref: "RQ-109", organisation: "Levantina Agro S.A.", place: "Valencia, Spain", age: "Clarification asked 1 day ago",
    identity: [
      { state: "on", label: "Email confirmed", detail: "29 July 2026" },
      { state: "on", label: "Telephone confirmed", detail: "29 July 2026" },
      { state: "on", label: "Business information supplied", detail: "B-46 118 220, Valencia" },
      { state: "on", label: "Business registry match completed", detail: "Registro Mercantil · 29 July 2026" },
      { state: "declared", label: "Commercial authority declared", detail: "Managing partner, declared by the member" },
      { state: "no", label: "Commercial authority not independently verified", detail: "Ponte has not confirmed this with the organisation" },
    ],
    summary: [
      { label: "Role in the proposed transaction", value: "Service provider" },
      { label: "Capacity", value: "Bottling and private-label packing" },
      { label: "Organisation", value: "Levantina Agro S.A." },
      { label: "Preferred language", value: "Spanish" },
      { label: "What they want to discuss", value: "Offering bottling capacity rather than buying product.", wide: true },
      { label: "Quantity, capacity or scope", value: "Line capacity 12,000 units per day, 500 ml retail format." },
      { label: "Origin, destination or territory", value: "Valencia; can ship across the EU." },
      { label: "Timing", value: "Available from October 2026." },
      { label: "Delivery and payment basis", value: "Not applicable to a service." },
      { label: "Relevant capability", value: "Organic-certified line; certificate available." },
      { label: "Evidence categories available", value: "Organic certification · facility licence · insurance." },
    ],
    asked: {
      on: "31 July 2026",
      questions: [
        "Which named buyer are you acting for, or are you offering a service rather than a purchase?",
        "Can you confirm whether the organic certification covers a private-label pack?",
      ],
    },
  },
];
