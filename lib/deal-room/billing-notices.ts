/**
 * Deal Room billing notices, in the five included languages.
 *
 * Authority: `PT-COMMERCIAL-2026-07-31-01` sections 11, 12 and 13, recorded by
 * ADR-0020. Stage 7 of `docs/plans/active/deal-room-transaction-pricing.md`.
 *
 * Four notices exist because four things happen to a paid period: it starts, it
 * gains a concurrent branch, it ends, and it starts again. Section 12 makes
 * reactivation a *new* period rather than an extension, so it is its own notice
 * and says so; a member who reads "renewed" would reasonably expect the previous
 * period's terms to continue, and they do not.
 *
 * ## Why the language set here is not the site's
 *
 * Section 13 creates a scoped exception to the English-only interface policy for
 * authenticated Deal Room surfaces and Deal Room transactional notices. It does
 * not authorise a multilingual public website. So this module builds on
 * `./language` (the Deal Room set) and never on `i18n/routing` (the interface
 * set), exactly as `language.ts` explains at length.
 *
 * ## Arabic, and why interpolation is the only way in
 *
 * Section 13 requires right-to-left presentation that preserves left-to-right
 * trade identifiers: HS codes, Incoterms, currency codes, quantities, units,
 * container codes and company names. A bare `$79 USD` dropped into Arabic prose
 * does not survive the Unicode bidi algorithm intact - the `$` is a neutral
 * character and migrates to the wrong end of the amount.
 *
 * The fix is Unicode isolates, and the design decision is that a caller cannot
 * forget them. Every value reaches a notice through `substitute`, which isolates
 * it when the target language is RTL. There is no code path that puts a
 * caller-supplied string into Arabic output un-isolated, so the property is
 * structural rather than a rule someone has to remember. Literal Latin tokens
 * inside the Arabic templates - only the word "Ponte" - are wrapped at the point
 * of definition by `ltr()`, and the test suite walks every Arabic rendering to
 * prove no Latin letter escapes an isolate.
 *
 * Bare Western digits in Arabic prose ("30 days") are deliberately left alone.
 * European numbers are resolved correctly inside an RTL run by the bidi
 * algorithm; Latin letters and mixed alphanumeric identifiers are not. Isolating
 * the former would add noise without changing a single rendered glyph.
 *
 * ## What these notices may not do
 *
 * They are addressed to the room administrator, who is the payer and the only
 * party section 11 permits a billing breakdown to reach. Even so, the fact types
 * below carry **no branch identifier, counterparty name or branch count**, so an
 * additional-branch notice cannot disclose which branch was added or how many
 * exist. That is enforced by the shape of the input rather than by review: there
 * is no field to put it in.
 */

import {
  MAXIMUM_ROOM_PERIOD_PRICE_CENTS,
  formatUsd,
} from "./pricing";
import {
  DEAL_ROOM_LANGUAGES,
  dealRoomLanguageDir,
  isSupportedDealRoomLanguage,
  type DealRoomLanguage,
} from "./language";

/* ------------------------------------------------------------------ *
 * 1. Bidi isolation
 * ------------------------------------------------------------------ */

/** U+2066 LEFT-TO-RIGHT ISOLATE. Opens a run forced to render left-to-right. */
export const LRI = "⁦";

/** U+2069 POP DIRECTIONAL ISOLATE. Closes the innermost open isolate. */
export const PDI = "⁩";

/**
 * Wrap a value so it renders left-to-right whatever surrounds it.
 *
 * Isolate rather than embed (U+202A LRE): an isolate also stops the wrapped run
 * from reordering the text *around* it, which is what keeps a room reference
 * from dragging the following Arabic clause out of order. LRE would protect the
 * identifier and corrupt the sentence.
 *
 * Already-isolated input is returned unchanged so that double-wrapping through
 * two code paths cannot produce nested isolates that some renderers cap out on.
 */
export function isolateLtr(value: string): string {
  if (value.startsWith(LRI) && value.endsWith(PDI)) return value;
  return `${LRI}${value}${PDI}`;
}

/** Marks a literal Latin token inside a template. See the module comment. */
const ltr = isolateLtr;

/* ------------------------------------------------------------------ *
 * 2. The four notices and their facts
 * ------------------------------------------------------------------ */

export const BILLING_NOTICE_KINDS = [
  "activation",
  "additional_branch",
  "expiry",
  "reactivation",
] as const;

export type BillingNoticeKind = (typeof BILLING_NOTICE_KINDS)[number];

/**
 * A room reference and a date, both of which must survive RTL intact.
 *
 * Dates are ISO `YYYY-MM-DD` strings rather than `Date` objects rendered through
 * `Intl`. Two reasons, and the second is the real one. First, a period boundary
 * is a contractual fact and `2026-08-30` is unambiguous in all five languages,
 * where `08/30/2026` and `30/08/2026` are not. Second, locale-formatted dates
 * would make the output depend on the ICU data compiled into whatever runtime
 * sends the notice, so the same period could be described two different ways to
 * two participants. A trade identifier is exactly what section 13 says to keep
 * stable, and a period end date behaves like one.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface RoomFacts {
  /** Member-visible room reference, e.g. `PT-DR-4417`. Never a database id. */
  roomReference: string;
}

export interface ActivationFacts extends RoomFacts {
  amountCents: number;
  /** Last day of the paid period, ISO `YYYY-MM-DD`. */
  periodEndIso: string;
}

export interface AdditionalBranchFacts extends RoomFacts {
  /** The charge for this one addition, not the period total. */
  amountCents: number;
  /** The period total after this charge, for the section 11 breakdown. */
  periodTotalCents: number;
}

export interface ExpiryFacts extends RoomFacts {
  /** The day the paid period ended, ISO `YYYY-MM-DD`. */
  endedOnIso: string;
}

export interface ReactivationFacts extends RoomFacts {
  amountCents: number;
  /** Last day of the **new** period, ISO `YYYY-MM-DD`. */
  periodEndIso: string;
}

export type BillingNoticeRequest =
  | { kind: "activation"; language: DealRoomLanguage; facts: ActivationFacts }
  | { kind: "additional_branch"; language: DealRoomLanguage; facts: AdditionalBranchFacts }
  | { kind: "expiry"; language: DealRoomLanguage; facts: ExpiryFacts }
  | { kind: "reactivation"; language: DealRoomLanguage; facts: ReactivationFacts };

export interface RenderedNotice {
  kind: BillingNoticeKind;
  language: DealRoomLanguage;
  /** `rtl` for Arabic only. Set this on the rendering element. */
  dir: "rtl" | "ltr";
  subject: string;
  body: string;
}

/* ------------------------------------------------------------------ *
 * 3. Copy
 * ------------------------------------------------------------------ */

interface Template {
  subject: string;
  body: string;
}

/**
 * Placeholders are `{name}`. `substitute` throws on any that survives, so a
 * language missing a value fails loudly at the point of rendering rather than
 * mailing a member a literal `{amount}`.
 *
 * Every notice that takes money states it with the currency spelled out, per
 * section 13: "Use `USD` where `$` alone could be ambiguous." `formatUsd` does
 * that unconditionally.
 *
 * The activation and reactivation notices both carry the no-auto-renewal
 * sentence because section 12 forbids silent renewal, and the moment a member
 * has just paid is the moment that promise is worth making.
 */
const COPY: Record<BillingNoticeKind, Record<DealRoomLanguage, Template>> = {
  activation: {
    en: {
      subject: "Deal Room {room} is active for 30 days",
      body:
        "Payment of {amount} is recorded. {room} is active until {until}. " +
        "Five concurrent counterparty branches are included at no additional charge. " +
        "Ponte never renews a period automatically.",
    },
    es: {
      subject: "La Sala de Operaciones {room} está activa durante 30 días",
      body:
        "Se ha registrado el pago de {amount}. {room} está activa hasta {until}. " +
        "Se incluyen cinco ramas de contraparte simultáneas sin cargo adicional. " +
        "Ponte nunca renueva un periodo automáticamente.",
    },
    ru: {
      subject: "Комната сделки {room} активна в течение 30 дней",
      body:
        "Платёж {amount} зарегистрирован. Комната {room} активна до {until}. " +
        "Пять одновременных ветвей контрагентов включены без дополнительной платы. " +
        "Ponte никогда не продлевает период автоматически.",
    },
    "zh-CN": {
      subject: "交易室 {room} 已激活 30 天",
      body:
        "已记录付款 {amount}。{room} 的有效期至 {until}。" +
        "已包含五条同时进行的交易对手分支，不另收费。" +
        "Ponte 绝不会自动续期。",
    },
    ar: {
      subject: "غرفة الصفقة {room} نشطة لمدة 30 يومًا",
      body:
        "تم تسجيل دفعة {amount}. الغرفة {room} نشطة حتى {until}. " +
        "خمسة فروع أطراف مقابلة متزامنة مشمولة دون رسوم إضافية. " +
        `لا تجدّد ${ltr("Ponte")} أي فترة تلقائيًا.`,
    },
  },

  additional_branch: {
    en: {
      subject: "An additional concurrent branch was added to {room}",
      body:
        "A charge of {amount} is recorded for one additional concurrent counterparty branch. " +
        "The total for this 30-day period is now {total}. " +
        "No period is ever charged more than {cap}.",
    },
    es: {
      subject: "Se añadió una rama simultánea adicional a {room}",
      body:
        "Se ha registrado un cargo de {amount} por una rama de contraparte simultánea adicional. " +
        "El total de este periodo de 30 días es ahora {total}. " +
        "Ningún periodo se cobra por encima de {cap}.",
    },
    ru: {
      subject: "В комнату {room} добавлена дополнительная одновременная ветвь",
      body:
        "Зарегистрирован платёж {amount} за одну дополнительную одновременную ветвь контрагента. " +
        "Итог за этот 30-дневный период теперь составляет {total}. " +
        "Ни один период не тарифицируется выше {cap}.",
    },
    "zh-CN": {
      subject: "已为 {room} 添加一条额外的同时进行分支",
      body:
        "已记录 {amount} 的费用，用于一条额外的同时进行的交易对手分支。" +
        "本 30 天周期的总额现为 {total}。" +
        "任何周期的收费都不会超过 {cap}。",
    },
    ar: {
      subject: "تمت إضافة فرع متزامن إضافي إلى الغرفة {room}",
      body:
        "تم تسجيل رسم {amount} مقابل فرع طرف مقابل متزامن إضافي. " +
        "إجمالي هذه الفترة البالغة 30 يومًا هو الآن {total}. " +
        "لا تتجاوز رسوم أي فترة {cap}.",
    },
  },

  expiry: {
    en: {
      subject: "Deal Room {room} is now read-only",
      body:
        "The paid period for {room} ended on {until}. The room and its branches are now read-only. " +
        "Nothing has been deleted: messages, documents, agreements and participants are all retained. " +
        "No payment has been taken and none will be without a new instruction. " +
        "Reactivating starts a new 30-day period.",
    },
    es: {
      subject: "La Sala de Operaciones {room} es ahora de solo lectura",
      body:
        "El periodo de pago de {room} finalizó el {until}. La sala y sus ramas son ahora de solo lectura. " +
        "No se ha eliminado nada: los mensajes, los documentos, los acuerdos y los participantes se conservan. " +
        "No se ha cobrado ningún importe ni se cobrará sin una nueva instrucción. " +
        "La reactivación inicia un nuevo periodo de 30 días.",
    },
    ru: {
      subject: "Комната сделки {room} теперь доступна только для чтения",
      body:
        "Оплаченный период комнаты {room} завершился {until}. Комната и её ветви теперь доступны только для чтения. " +
        "Ничего не удалено: сообщения, документы, соглашения и участники сохранены. " +
        "Платёж не взимался и не будет взиматься без нового распоряжения. " +
        "Возобновление начинает новый 30-дневный период.",
    },
    "zh-CN": {
      subject: "交易室 {room} 现为只读",
      body:
        "{room} 的付费周期已于 {until} 结束。该室及其分支现为只读。" +
        "没有删除任何内容：消息、文件、协议和参与者均予保留。" +
        "未收取任何款项，未经新的指示也不会收取。" +
        "重新启用将开始一个新的 30 天周期。",
    },
    ar: {
      subject: "غرفة الصفقة {room} أصبحت للقراءة فقط",
      body:
        "انتهت الفترة المدفوعة للغرفة {room} في {until}. الغرفة وفروعها الآن للقراءة فقط. " +
        "لم يُحذف أي شيء: الرسائل والمستندات والاتفاقيات والمشاركون محفوظون جميعًا. " +
        "لم تُحصَّل أي دفعة ولن تُحصَّل دون تعليمات جديدة. " +
        "تؤدي إعادة التنشيط إلى بدء فترة جديدة مدتها 30 يومًا.",
    },
  },

  reactivation: {
    en: {
      subject: "Deal Room {room} is active again for 30 days",
      body:
        "Payment of {amount} is recorded and {room} is active until {until}. " +
        "This is a new 30-day period, priced from the branches selected to remain active, " +
        "rather than an extension of the previous one. " +
        "Ponte never renews a period automatically.",
    },
    es: {
      subject: "La Sala de Operaciones {room} vuelve a estar activa durante 30 días",
      body:
        "Se ha registrado el pago de {amount} y {room} está activa hasta {until}. " +
        "Se trata de un nuevo periodo de 30 días, calculado a partir de las ramas seleccionadas " +
        "para seguir activas, y no de una prórroga del anterior. " +
        "Ponte nunca renueva un periodo automáticamente.",
    },
    ru: {
      subject: "Комната сделки {room} снова активна в течение 30 дней",
      body:
        "Платёж {amount} зарегистрирован, комната {room} активна до {until}. " +
        "Это новый 30-дневный период, стоимость которого рассчитана по ветвям, выбранным " +
        "для сохранения активности, а не продление предыдущего. " +
        "Ponte никогда не продлевает период автоматически.",
    },
    "zh-CN": {
      subject: "交易室 {room} 重新激活 30 天",
      body:
        "已记录付款 {amount}，{room} 的有效期至 {until}。" +
        "这是一个新的 30 天周期，按选择保持活动的分支计价，而非延长上一周期。" +
        "Ponte 绝不会自动续期。",
    },
    ar: {
      subject: "غرفة الصفقة {room} نشطة مجددًا لمدة 30 يومًا",
      body:
        "تم تسجيل دفعة {amount} والغرفة {room} نشطة حتى {until}. " +
        "هذه فترة جديدة مدتها 30 يومًا، تُحتسب على أساس الفروع المختارة للبقاء نشطة، " +
        "وليست تمديدًا للفترة السابقة. " +
        `لا تجدّد ${ltr("Ponte")} أي فترة تلقائيًا.`,
    },
  },
};

/* ------------------------------------------------------------------ *
 * 4. Rendering
 * ------------------------------------------------------------------ */

const PLACEHOLDER = /\{([a-z]+)\}/g;

/**
 * Replace `{name}` placeholders, isolating each value for RTL output.
 *
 * This is the single door every caller-supplied value walks through, which is
 * what makes the Arabic guarantee structural. An unknown or unsubstituted
 * placeholder throws: a notice about money that renders `{amount}` is worse than
 * one that fails to send, because the second gets noticed.
 */
function substitute(template: string, values: Record<string, string>, rtl: boolean): string {
  const out = template.replace(PLACEHOLDER, (whole, name: string) => {
    const value = values[name];
    if (value === undefined) {
      throw new Error(`no value for placeholder ${whole}`);
    }
    return rtl ? isolateLtr(value) : value;
  });

  const leftover = out.match(PLACEHOLDER);
  if (leftover) {
    throw new Error(`unsubstituted placeholder(s): ${leftover.join(", ")}`);
  }
  return out;
}

function assertIsoDate(value: string, field: string): void {
  if (!ISO_DATE.test(value)) {
    throw new TypeError(`${field} must be an ISO YYYY-MM-DD date, received ${JSON.stringify(value)}`);
  }
}

function assertReference(value: string): void {
  if (value.trim() === "") {
    throw new TypeError("roomReference must not be empty");
  }
}

/**
 * Render one billing notice.
 *
 * Pure: no clock, no I/O, no provider. Money arrives as cents already decided by
 * `pricing.ts` and `charging.ts` and is only formatted here, so a notice can
 * never state a price the engine did not calculate. The only constant this
 * module names itself is the published period maximum, which is a promise made
 * to the member rather than a charge.
 */
export function renderBillingNotice(request: BillingNoticeRequest): RenderedNotice {
  const { kind, language } = request;

  if (!isSupportedDealRoomLanguage(language)) {
    throw new TypeError(`unsupported Deal Room language: ${JSON.stringify(language)}`);
  }

  const dir = dealRoomLanguageDir(language);
  const rtl = dir === "rtl";
  const template = COPY[kind][language];

  assertReference(request.facts.roomReference);
  const values: Record<string, string> = { room: request.facts.roomReference };

  switch (request.kind) {
    case "activation":
    case "reactivation": {
      assertIsoDate(request.facts.periodEndIso, "periodEndIso");
      values.amount = formatUsd(request.facts.amountCents);
      values.until = request.facts.periodEndIso;
      break;
    }
    case "additional_branch": {
      values.amount = formatUsd(request.facts.amountCents);
      values.total = formatUsd(request.facts.periodTotalCents);
      values.cap = formatUsd(MAXIMUM_ROOM_PERIOD_PRICE_CENTS);
      break;
    }
    case "expiry": {
      assertIsoDate(request.facts.endedOnIso, "endedOnIso");
      values.until = request.facts.endedOnIso;
      break;
    }
  }

  return {
    kind,
    language,
    dir,
    subject: substitute(template.subject, values, rtl),
    body: substitute(template.body, values, rtl),
  };
}

/** Every notice for one event, for a room whose participants read differently. */
export function renderInEveryLanguage(
  request: Omit<Extract<BillingNoticeRequest, { kind: BillingNoticeKind }>, "language">,
): RenderedNotice[] {
  return DEAL_ROOM_LANGUAGES.map((language) =>
    renderBillingNotice({ ...request, language } as BillingNoticeRequest),
  );
}
