# Privacy notes (Philippine Data Privacy Act of 2012, RA 10173)

> **Needs review by the organization and, ideally, legal counsel.** This is an engineering summary of how the software handles personal data and what the club still has to decide. It is not legal advice.

## Roles

- **Personal information controller:** R3 Riders Organization Incorporated.
- **Data protection contact (to be named):** `[name, email, phone]`. Shown in the Privacy Policy and on forms. Register/notify with the National Privacy Commission as required for the organization's size and processing.
- **Processors (infrastructure):** Supabase (database, auth, file storage), Vercel (hosting), Resend (email), Cloudflare Turnstile (optional bot check), PayMongo (only if the gateway is enabled). Sign or confirm data processing terms with each and note where data is hosted.

## What personal data is collected, and where

| Data | Collected via | Stored in | Who can read it |
|---|---|---|---|
| Name, email, phone, address, birthdate, license no., riding history, references | Membership application | `applications` | Officers, admins |
| Profile, road name, phone, address | Member profile | `profiles` | The member; officers/admins; other members only per privacy toggles through the `member_directory` view |
| **Blood type, emergency contact** | Member profile (optional) | `profiles` | The member and officers/admins only. Never in the directory |
| Motorcycles | Application / profile | `motorcycles` | The member; officers/admins; directory only if `show_motorcycles` |
| Photo | Profile upload | private bucket `member-avatars` (signed URLs) | Signed-in members |
| Donor name, email, message, amount, proof of payment | Donation form | `donations`, private bucket `payment-proofs` | Officers, admins |
| Customer name, email, phone, delivery address, proof of payment | Checkout | `orders`, `payment-proofs` | Officers, admins; the customer via an emailed link |
| Dues payments and proofs | Member dues | `dues_payments`, `payment-proofs` | The member; officers/admins |
| Contact and volunteer messages | Public forms | `contact_messages`, `volunteer_signups` | Officers, admins |
| Audit entries (who changed what) | Automatic | `audit_log` | Admins. Profiles log only id, role and status |

No card data is ever collected or stored. Payment proofs are screenshots/receipts supplied by the payer.

## Consent and transparency

- Every public form that collects personal data (application, contact, volunteer, event interest, checkout, donation) requires an explicit, unticked **consent checkbox** linking to the Privacy Policy. The application also requires agreement to the club rules.
- The Privacy Policy is currently a **draft placeholder** (`src/lib/legal-content.ts`, marked as draft on the page). It must be completed with the organization's real retention periods and data protection contact before launch.
- Members control directory visibility: everything is **private by default** and each field (phone, email, motorcycles) has its own toggle.

## Minimization and access control (how the software enforces it)

- Row Level Security on every table; members can only read their own sensitive rows. Orders and donations are not readable by the public at all; guests reach their order only with an emailed token whose hash is stored.
- Emergency contact and blood type are readable only by the member and officers/admins; the directory is a database view that exposes only opted-in columns.
- Private storage buckets for proofs, documents and avatars; officers get short-lived signed URLs (10 minutes) for proofs.
- The service-role key is used only in server code for invitations, webhooks, guest order/donation creation and stock functions, after the caller's role is checked.
- Rate limiting and honeypots on public forms; optional Turnstile.
- **Donor CSV export** is restricted to officers/admins, neutralises spreadsheet formulas, and is **recorded in the audit log before the file is produced** (if logging fails, the export is refused).

## Retention (proposal, to be decided by the club)

| Data | Suggested retention |
|---|---|
| Rejected / abandoned applications | Delete after 12 months |
| Approved applications | Keep while the person is a member, then 12 months |
| Member profiles | While active; anonymise or delete within 12 months after membership ends |
| Orders and donations (incl. proofs) | Keep for the period required by accounting/tax rules (commonly 5-10 years); delete proof images after verification if not needed |
| Contact messages | 12 months |
| Rate-limit counters | Auto-purged daily by the application |
| Audit log | Keep at least 2 years |

The software does not yet delete data automatically; deletion is a manual admin task until the club fixes its policy. A scheduled clean-up job is listed under v2.

## Data subject requests

People may ask to **access, correct, erase, block, or port** their data, and may withdraw consent or object to processing. Suggested process:
1. Requests go to the data protection contact (email on the Contact page and Privacy Policy). Verify identity.
2. An admin finds the person under **Admin > Members** (or in applications, orders, donations) and exports or corrects the data.
3. Erasure: delete the member in the Supabase dashboard (cascades profile, motorcycles, RSVPs, signups) after confirming nothing must be kept for legal/accounting reasons; anonymise donation/order rows that must remain.
4. Respond within the period required by the NPC and log the request outside the app.

## Breach response

If personal data may have been exposed: contain (rotate the Supabase keys, disable accounts), assess, and notify the National Privacy Commission and affected people **within 72 hours** where the law requires. Keep a record of the incident and remediation.

## Open items for the organization

- [ ] Name the data protection contact and publish the address/phone/email
- [ ] Decide retention periods and finalise the Privacy Policy and Terms
- [ ] Confirm hosting region and processor agreements (Supabase, Vercel, Resend)
- [ ] Confirm whether the club must register its data processing system with the NPC
- [ ] Confirm donation-receipt accreditation before enabling "official receipts" (Admin > Site content)
- [ ] Review the ride waiver wording with counsel
