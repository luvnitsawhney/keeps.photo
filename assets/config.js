// Public config only — nothing secret goes in this file.
window.KEEPS_CONFIG = {
  api: "https://fcjqeenkrqgljbfsyzle.supabase.co/functions/v1/keeps-api",
  // Direct storage host for fast resumable uploads.
  tus: "https://fcjqeenkrqgljbfsyzle.storage.supabase.co/storage/v1/upload/resumable/sign",
  // Publishable (anon) key — safe to expose; the bucket has no public policies.
  publishableKey: "sb_publishable_qA7FMNbk8WiWqRcCLR-_Jw_PiMrvARU",
  // PostHog: public project key (phc_…) and region host. Empty key = analytics off.
  // Google Ads. gtm: the GTM container. aw: the Google Ads conversion ID (AW-…) and each conversion's label,
  // from Google Ads → Goals → Conversions → the conversion → Tag setup → "Use Google Tag Manager".
  // Leave aw/labels empty to rely on GTM triggers on the begin_checkout and purchase dataLayer events.
  ads: { gtm: "GTM-TNWXHS26", aw: "AW-18595090424", beginLabel: "", purchaseLabel: "x8u4CLH_wcAdEPif6qJF" },
  posthog: { key: "phc_rHhjuzJBwbuwF7idjVV6wrtRcuYccVCgDNVaLtuuo28d", host: "https://us.i.posthog.com" },
  contactEmail: "hello@keeps.photo",
};
