// Provider adapters for Email / SMS / WhatsApp. Without credentials they log to the server console (dev fallback).
export interface Sender { send(to: string, subject: string, text: string): Promise<void> }

export const emailSender: Sender = {
  async send(to, subject, text) {
    if (!process.env.SMTP_HOST) {
      console.log(`[email:dev] to=${to} subject="${subject}" text="${text}"`);
      return;
    }
    const nodemailer = await import("nodemailer");
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    await t.sendMail({ from: process.env.SMTP_FROM, to, subject, text });
  },
};

export const smsSender: Sender = {
  async send(to, _subject, text) {
    const url = process.env.SMS_API_URL;
    if (!url) {
      console.log(`[sms:dev] to=${to} text="${text}"`);
      return;
    }
    const res = await fetch(url.replace("{to}", encodeURIComponent(to)).replace("{message}", encodeURIComponent(text)));
    if (!res.ok) throw new Error("SMS gateway error " + res.status);
  },
};

export const whatsappSender: Sender = {
  async send(to, _subject, text) {
    const token = process.env.WHATSAPP_TOKEN, phoneId = process.env.WHATSAPP_PHONE_ID;
    if (!token || !phoneId) {
      console.log(`[whatsapp:dev] to=${to} text="${text}"`);
      return;
    }
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/\D/g, ""), type: "text", text: { body: text } }),
    });
    if (!res.ok) throw new Error("WhatsApp API error " + res.status);
  },
};
