// Supabase Edge Function: notify-whatsapp
//
// Sends an automated WhatsApp message via Meta's WhatsApp Cloud API when a
// ticket is marked resolved. Wire it up with a Supabase Database Webhook:
//   Supabase Dashboard > Database > Webhooks > Create a new webhook
//     Table: issues
//     Events: Update
//     Type: HTTP Request -> this function's URL
//     Condition (optional but recommended): only fire when status = 'resolved'
//
// This is entirely optional. The app also has a manual "Notify on WhatsApp"
// tap-to-send link that needs no backend at all - start there, add this
// later if you want it fully automatic.
//
// Requires a WhatsApp Business Account, a phone number connected to the
// Cloud API, and one pre-approved Utility template (Meta Business Manager >
// WhatsApp Manager > Message Templates). Example template body, category
// "Utility":
//   "Hi {{1}}, your {{2}} issue (ticket {{3}}) has been resolved. Thanks for
//    your patience."
//
// Set these secrets before deploying:
//   supabase secrets set META_WHATSAPP_TOKEN=xxxxx
//   supabase secrets set META_PHONE_NUMBER_ID=xxxxx
//   supabase secrets set META_TEMPLATE_NAME=issue_resolved
//   supabase secrets set META_TEMPLATE_LANG=en

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;

    if (!record || record.status !== "resolved" || !record.reporter_phone) {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const token = Deno.env.get("META_WHATSAPP_TOKEN");
    const phoneNumberId = Deno.env.get("META_PHONE_NUMBER_ID");
    const templateName = Deno.env.get("META_TEMPLATE_NAME") || "issue_resolved";
    const templateLang = Deno.env.get("META_TEMPLATE_LANG") || "en";

    if (!token || !phoneNumberId) {
      return new Response(
        JSON.stringify({ error: "Missing META_WHATSAPP_TOKEN or META_PHONE_NUMBER_ID secret" }),
        { status: 500 }
      );
    }

    const to = String(record.reporter_phone).replace(/[^0-9]/g, "");
    const ticketNo = "#" + String(record.id).padStart(4, "0");

    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLang },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: record.reporter_name || "there" },
                { type: "text", text: record.category || "reported" },
                { type: "text", text: ticketNo },
              ],
            },
          ],
        },
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: result }), { status: res.status });
    }

    return new Response(JSON.stringify({ sent: true, result }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
