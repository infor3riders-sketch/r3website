/**
 * DRAFT legal text. Placeholder content only, flagged on-page for review by the organization
 * (and ideally legal counsel) before launch. Not legal advice.
 */
export interface LegalSection {
  heading: string;
  body: string[];
}
export interface LegalDoc {
  slug: string;
  title: string;
  summary: string;
  sections: LegalSection[];
}

export const LEGAL_DRAFT_NOTICE =
  "Draft content. This text is a placeholder and must be reviewed and approved by R3 Riders and, ideally, legal counsel before it is relied on.";

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "How we collect, use and protect personal information, in line with the Data Privacy Act of 2012 (RA 10173).",
    sections: [
      {
        heading: "Information we collect",
        body: [
          "Membership applications: name, contact details, address, birthdate, riding experience, motorcycle details and references.",
          "Member profiles: emergency contact and blood type (optional, visible only to authorized officers), directory preferences.",
          "Donations and orders: name, email, delivery address and payment reference or proof of payment.",
          "Contact and volunteer forms: the details you submit.",
        ],
      },
      {
        heading: "Why we collect it",
        body: [
          "To process applications and manage membership, to organize rides and activities safely, to fulfil orders, to acknowledge donations and to respond to your messages.",
          "We do not sell personal information.",
        ],
      },
      {
        heading: "Who can see it",
        body: [
          "Only authorized officers and administrators, on a need-to-know basis. Members see other members only what those members choose to share in the directory.",
          "We use trusted service providers (hosting, database, email, payments) who process data on our behalf.",
        ],
      },
      {
        heading: "Retention",
        body: [
          "Application data is kept while the application is active and for a limited period afterwards. Member data is kept while membership continues and as required for records. [Retention periods to be confirmed by the organization.]",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You may request access, correction, or deletion of your personal data, object to processing, and withdraw consent, subject to legal limits.",
          "Contact our data protection contact: [name], [email]. You may also complain to the National Privacy Commission.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of Use",
    summary: "The rules for using this website and the member portal.",
    sections: [
      {
        heading: "Using this site",
        body: [
          "Use the website lawfully and respectfully. Do not attempt to access areas you are not authorized to use, disrupt the service, or submit false information.",
        ],
      },
      {
        heading: "Accounts",
        body: [
          "Member accounts are created by invitation and are personal. Keep your credentials secure and tell us promptly about any unauthorized use.",
        ],
      },
      {
        heading: "Content",
        body: ["Club names, logos and content belong to the organization. Do not reuse them without permission."],
      },
      {
        heading: "Liability",
        body: ["Riding carries risk. Participation in rides and events is subject to the club's rules and waivers. [Legal wording to be provided by the organization.]"],
      },
    ],
  },
  {
    slug: "shop-policies",
    title: "Shipping & Returns",
    summary: "How orders are paid, shipped and handled if something goes wrong.",
    sections: [
      {
        heading: "Payment",
        body: [
          "Orders are confirmed after an officer verifies your payment (for example GCash or bank transfer). Unpaid orders are released after a few days.",
        ],
      },
      {
        heading: "Shipping",
        body: ["Delivery within the Philippines. [Shipping fees, couriers and lead times to be confirmed.]"],
      },
      {
        heading: "Returns and exchanges",
        body: ["Contact us within [number] days of receiving your order for defects or wrong items. [Return conditions to be confirmed.]"],
      },
    ],
  },
  {
    slug: "donation-policy",
    title: "Donation Policy",
    summary: "How donations are verified, acknowledged and used.",
    sections: [
      {
        heading: "How donations work",
        body: [
          "Donations are verified by an officer before they count toward a campaign total. You will receive an acknowledgement email once verified.",
        ],
      },
      {
        heading: "Receipts",
        body: [
          "Unless the organization confirms official accreditation to issue donation receipts for tax purposes, the email you receive is an acknowledgement, not an official receipt. [Accreditation status to be confirmed.]",
        ],
      },
      {
        heading: "Use of funds",
        body: ["Funds are used for the programs and campaigns described on the Donations page, including a summary of how funds are used."],
      },
      {
        heading: "Refunds",
        body: ["Donations are generally non-refundable. Contact us if you believe a donation was made in error."],
      },
    ],
  },
];

export const getLegalDoc = (slug: string) => LEGAL_DOCS.find((d) => d.slug === slug) ?? null;
