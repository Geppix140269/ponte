// The verbatim copy for the public About, Privacy, and Terms pages, plus the
// single operating entity used across the footer and those pages.
//
// Copy is the confirmed draft of 2026-07-25. It is rendered as-is: the pages
// present it box-free (rule rows and fine lines, no cards). Legal review is
// still pending on Privacy and Terms, so the copy lives here as data rather
// than translated message strings, and is served in English on every locale
// until a solicitor has signed it off and a translation pass is run.

/** The one operating entity. UK only; the complete 9-digit VAT. */
export const OPERATOR = {
  name: "1402 CELSIUS LTD",
  companyNo: "12475013",
  vat: "GB 343 1702 32",
  address: "20-22 Wenlock Road, London, England, N1 7GU, United Kingdom",
} as const;

/** The footer's legal-entity sentence. */
export const OPERATOR_LINE = `Ponte Trade is operated by ${OPERATOR.name}, Company No. ${OPERATOR.companyNo}, VAT ${OPERATOR.vat}, ${OPERATOR.address}.`;

/** The three active, distinct contact addresses. Never collapse these. */
export const CONTACT = {
  general: "hello@ponte.trade",
  privacy: "privacy@ponte.trade",
  legal: "legal@ponte.trade",
} as const;

export type Block =
  | { t: "h2"; text: string }
  | { t: "p"; text: string }
  | { t: "list"; items: string[] }
  | { t: "mail"; email: string };

export type LegalDoc = {
  /** Page title (Playfair display heading). */
  title: string;
  /** Optional "Last updated" line under the title. */
  updated?: string;
  /** Optional lead paragraph shown before the first section. */
  lead?: string;
  blocks: Block[];
};

// ---- About -----------------------------------------------------------------
export const ABOUT: LegalDoc = {
  title: "About",
  lead: "Ponte Trade is a cross-border trade network. We help businesses find, structure and verify trade opportunities, and connect the right people with a controlled introduction, not a cold contact list.",
  blocks: [
    {
      t: "p",
      text: "Ponte does not manufacture, buy, sell or ship anything itself. We provide information, review processes and introduction services between independent businesses.",
    },
    { t: "h2", text: "What Ponte does" },
    {
      t: "list",
      items: [
        "Find. Separates genuine qualified opportunities from unconfirmed market signals, so you always know what has been checked and what has not.",
        "Structure. Turns a rough buy, sell or service requirement into a clear, reviewable opportunity, tap by tap.",
        "Verify. Checks the businesses and claims that matter, and shows you exactly what was checked, against which source, and when. Never a score, never a badge without evidence behind it.",
        "Introduce. Connects two businesses only once there is a genuine commercial fit, and only with both sides' knowledge.",
      ],
    },
    // Moved here from the landing page. It is the account of how a record is
    // labelled, which is reference a visitor reads once and not an entrance, so
    // the landing links to it in a line instead of reprinting the argument.
    { t: "h2", text: "What Ponte shows you" },
    {
      t: "p",
      text: "Every record says what it is. Ponte does not present one kind as another, and does not claim a counterparty is safe.",
    },
    {
      t: "list",
      items: [
        "Market Signal. An indication Ponte has seen in the open market and has not confirmed. Nobody behind it has been contacted, and nothing about them is disclosed.",
        "Member Requirement. A requirement posted by a member, reviewed by the desk before publication.",
        "Member Offer. An offer posted by a member, reviewed by the desk before publication.",
        "Service Requirement. A trade service a member is looking for, reviewed on the same terms.",
      ],
    },
    {
      t: "p",
      text: "Start freely. Reading the board needs no account; you are asked to join only when an action needs to be saved or sent.",
    },
    { t: "h2", text: "What Ponte does not do" },
    {
      t: "p",
      text: "Ponte does not guarantee a counterparty, a transaction, a product, a mandate, creditworthiness, or performance. Every introduction and every piece of evidence is a starting point for your own commercial judgement, not a substitute for it.",
    },
    { t: "h2", text: "Who operates Ponte" },
    {
      t: "p",
      text: `Ponte Trade is operated by ${OPERATOR.name}, Company No. ${OPERATOR.companyNo}, VAT No. ${OPERATOR.vat}, registered at ${OPERATOR.address}.`,
    },
    { t: "h2", text: "Get in touch" },
    { t: "mail", email: CONTACT.general },
  ],
};

// ---- Privacy ---------------------------------------------------------------
export const PRIVACY: LegalDoc = {
  title: "Privacy Policy",
  updated: "Last updated: 25 July 2026",
  lead: `Ponte Trade is operated by ${OPERATOR.name} ("Ponte", "we", "us"), Company No. ${OPERATOR.companyNo}, registered at ${OPERATOR.address}. This policy explains what personal data we collect, why, and what rights you have over it, in line with UK GDPR and the Data Protection Act 2018.`,
  blocks: [
    { t: "h2", text: "1. What we collect" },
    {
      t: "list",
      items: [
        "Account details: name, business email, and the business you represent, when you create a Ponte account.",
        "Business information: the trade details, opportunities, and requirements you choose to submit (product, quantity, terms, origin/destination, and similar), and any documents or evidence you provide for verification.",
        "Verification data: publicly available or officially disclosed information about your business or a counterparty's business, used only to produce dated evidence records, never a score.",
        "Usage data: how you use the platform (pages visited, actions taken), collected to keep the service reliable and secure.",
        "Communications: messages you send through Ponte, and any correspondence with our team.",
      ],
    },
    {
      t: "p",
      text: "We never collect more than a screen asks for. Where a field is optional, it is marked as optional.",
    },
    { t: "h2", text: "2. Why we use it" },
    {
      t: "list",
      items: [
        "To provide the core service: finding, structuring, verifying, and introducing.",
        "To run our verification process and produce evidence records.",
        "To keep the platform secure and prevent misuse.",
        "To communicate with you about your account, submissions, and introductions.",
        "To meet our legal and regulatory obligations.",
      ],
    },
    {
      t: "p",
      text: "We do not use your data to train external AI models, and we do not sell your data to third parties. Some features, including the spoken and typed 'click and talk' objective entry, use an automated AI system to interpret what you say or type so we can route your request; you use those features knowing that an AI system processes your input.",
    },
    { t: "h2", text: "3. Who sees it" },
    {
      t: "list",
      items: [
        "Other businesses: only after a controlled introduction is agreed. Before that point, your identity and contact details are never disclosed. Market signals and qualified opportunities are shown to other users only in the safe, non-identifying form appropriate to that stage.",
        "Service providers: hosting, database, and infrastructure providers who process data on our behalf under contract, strictly to run the platform.",
        "Regulators and authorities: only where required by law.",
      ],
    },
    { t: "h2", text: "4. International transfers" },
    {
      t: "p",
      text: "Where any service provider is located outside the UK, we rely on appropriate safeguards, such as the UK's International Data Transfer Addendum, to keep your data protected to UK standards.",
    },
    { t: "h2", text: "5. How long we keep it" },
    {
      t: "p",
      text: "We keep account and business data for as long as your account is active, and for a limited period afterwards where needed to meet legal, accounting, or dispute-resolution requirements. You can ask us to delete your data sooner; see your rights below.",
    },
    { t: "h2", text: "6. Your rights" },
    { t: "p", text: "Under UK GDPR you have the right to:" },
    {
      t: "list",
      items: [
        "access the personal data we hold about you;",
        "ask us to correct inaccurate data;",
        "ask us to delete your data, subject to legal retention needs;",
        "ask us to restrict or object to certain processing;",
        "receive your data in a portable format;",
        "complain to the Information Commissioner's Office (ico.org.uk) if you believe we have not handled your data correctly.",
      ],
    },
    {
      t: "p",
      text: `To exercise any of these rights, contact ${CONTACT.privacy}.`,
    },
    { t: "h2", text: "7. Cookies" },
    {
      t: "p",
      text: "Ponte uses only the cookies necessary to keep you signed in and the platform working. We do not use advertising or tracking cookies.",
    },
    { t: "h2", text: "8. Changes to this policy" },
    {
      t: "p",
      text: "We will update this page when our practices change, and mark the date at the top. Material changes will be flagged to active users.",
    },
    { t: "h2", text: "9. Contact" },
    { t: "p", text: `${OPERATOR.name}, ${OPERATOR.address}.` },
    { t: "mail", email: CONTACT.privacy },
  ],
};

// ---- Terms -----------------------------------------------------------------
export const TERMS: LegalDoc = {
  title: "Terms of Service",
  updated: "Last updated: 25 July 2026",
  lead: `These terms govern your use of Ponte Trade, operated by ${OPERATOR.name} ("Ponte", "we", "us"), Company No. ${OPERATOR.companyNo}, VAT No. ${OPERATOR.vat}, registered at ${OPERATOR.address}. By using Ponte, you accept these terms.`,
  blocks: [
    { t: "h2", text: "1. What Ponte is" },
    {
      t: "p",
      text: "Ponte provides information, review processes and introduction services to help businesses find, structure, verify, and connect around cross-border trade opportunities. Ponte does not guarantee a counterparty, a transaction, a product, a mandate, creditworthiness, or performance. Any decision to trade, contract, ship, or pay remains entirely yours, made on your own commercial judgement.",
    },
    {
      t: "p",
      text: "Some Ponte features, including the spoken and typed 'click and talk' objective entry, use an automated AI system to interpret what you say or type. By using those features you acknowledge that an AI system processes your input to understand and route your request. The AI reads your intent only; it does not make any decision on your behalf, and nothing is submitted or sent until you choose.",
    },
    { t: "h2", text: "2. Who can use Ponte" },
    {
      t: "p",
      text: "Ponte is a business-to-business service. You must be acting on behalf of a business, be legally able to enter contracts, and provide accurate information about yourself and your business. Ponte is not intended for personal or consumer use.",
    },
    { t: "h2", text: "3. Your account" },
    {
      t: "p",
      text: "You are responsible for the accuracy of the information you submit and for keeping your account credentials secure. Ponte may verify the information you provide and may decline, suspend, or remove any account or submission that appears false, misleading, or in breach of these terms.",
    },
    { t: "h2", text: "4. Submissions and evidence" },
    {
      t: "p",
      text: "When you submit a trade opportunity, requirement, or business information, you confirm you have the right to share it and that it is accurate to your knowledge. Ponte structures what you supply; it does not invent missing details. Verification evidence shown on the platform reflects what was checked, against which source, and when; it is not a guarantee and does not remove the need for your own due diligence.",
    },
    { t: "h2", text: "5. Introductions" },
    {
      t: "p",
      text: "A controlled introduction connects two businesses only once both sides' relevant information has been reviewed and a commercial fit is indicated. Ponte facilitates the introduction; it is not a party to, and takes no responsibility for, any agreement, transaction, or dispute that follows between the introduced businesses.",
    },
    { t: "h2", text: "6. Fees" },
    {
      t: "p",
      text: "Any fees for using Ponte's services will be shown to you clearly before you incur them, at the pricing published on the platform at that time. We will not change pricing on a submission or introduction already in progress without telling you first.",
    },
    { t: "h2", text: "7. Acceptable use" },
    {
      t: "p",
      text: "You agree not to use Ponte to submit false information, misrepresent your business or authority to act for it, attempt to bypass the verification or introduction process, scrape or extract data outside normal use, or use the platform for any unlawful purpose.",
    },
    { t: "h2", text: "8. Intellectual property" },
    {
      t: "p",
      text: `The Ponte platform, its design, and its underlying technology belong to ${OPERATOR.name}. The business information you submit remains yours; you grant Ponte the right to process and display it as needed to provide the service, including in the safe, non-identifying form used for market signals prior to any introduction.`,
    },
    { t: "h2", text: "9. Disclaimers and liability" },
    {
      t: "p",
      text: "Ponte is provided 'as is.' To the fullest extent permitted by law, Ponte disclaims all warranties beyond those it cannot lawfully exclude, and is not liable for any indirect, incidental, or consequential loss, or for any loss arising from a transaction, introduction, or decision made using information from the platform. Nothing in these terms excludes liability for death, personal injury caused by negligence, or fraud.",
    },
    { t: "h2", text: "10. Termination" },
    {
      t: "p",
      text: "You may close your account at any time. Ponte may suspend or terminate your account for breach of these terms, suspected fraud, or misuse. On termination, provisions that by their nature should survive (including sections 8 and 9) continue to apply.",
    },
    { t: "h2", text: "11. Changes" },
    {
      t: "p",
      text: "We may update these terms from time to time. We will post the updated date at the top of this page and, for material changes, notify active users.",
    },
    { t: "h2", text: "12. Governing law" },
    {
      t: "p",
      text: "These terms are governed by the laws of England and Wales, and any dispute is subject to the exclusive jurisdiction of the courts of England and Wales.",
    },
    { t: "h2", text: "13. Contact" },
    { t: "p", text: `${OPERATOR.name}, ${OPERATOR.address}.` },
    { t: "mail", email: CONTACT.legal },
  ],
};
