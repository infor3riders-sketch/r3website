/** Short donor-facing reference derived from the donation id (shown in emails and on the thank-you page). */
export const donationReference = (id: string) => id.replace(/-/g, "").slice(0, 8).toUpperCase();
