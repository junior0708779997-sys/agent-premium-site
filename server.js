const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const WAVE_API_KEY = process.env.WAVE_API_KEY || "";
const WAVE_BASE_URL = process.env.WAVE_BASE_URL || "https://api.wave.com";
const WAVE_WEBHOOK_SECRET = process.env.WAVE_WEBHOOK_SECRET || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESET_FROM_EMAIL = process.env.RESET_FROM_EMAIL || "";
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || "";
const backups = [];
const resetTokens = new Map();

const sessions = new Map();

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "agent-premium-payments" });
});

app.post("/api/wave/checkout", async (req, res) => {
  const {
    orderId = "",
    amount = 0,
    currency = "XOF",
    successUrl = "",
    errorUrl = "",
    customerName = "",
    customerPhone = "",
    items = []
  } = req.body || {};

  const total = parseInt(amount, 10) || 0;
  if (!total || total < 100) {
    return res.status(400).json({ ok: false, message: "Montant invalide." });
  }

  if (!WAVE_API_KEY) {
    return res.status(400).json({
      ok: false,
      message: "WAVE_API_KEY manquante.",
      launchUrl: ""
    });
  }

  try {
    const response = await fetch(`${WAVE_BASE_URL}/v1/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WAVE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: String(total),
        currency,
        error_url: errorUrl,
        success_url: successUrl,
        client_reference: orderId || `cmd_${Date.now()}`,
        metadata: {
          customerName,
          customerPhone,
          itemsCount: Array.isArray(items) ? items.length : 0
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        message: "Echec creation session Wave.",
        details: data
      });
    }

    const launchUrl = data.wave_launch_url || data.checkout_url || "";
    const sessionId = data.id || data.session_id || "";
    if (sessionId) {
      sessions.set(sessionId, {
        sessionId,
        orderId,
        amount: total,
        status: "created",
        createdAt: new Date().toISOString()
      });
    }

    return res.json({ ok: true, launchUrl, sessionId, raw: data });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Erreur serveur.", error: String(error) });
  }
});

app.post("/api/wave/webhook", express.raw({ type: "*/*" }), (req, res) => {
  const signature = req.headers["wave-signature"] || "";
  const payload = req.body || Buffer.from("");

  if (WAVE_WEBHOOK_SECRET) {
    const digest = crypto
      .createHmac("sha256", WAVE_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");
    if (signature && digest !== signature) {
      return res.status(401).send("invalid signature");
    }
  }

  let event = {};
  try {
    event = JSON.parse(payload.toString("utf8") || "{}");
  } catch {
    return res.status(400).send("invalid payload");
  }

  const sessionId = event?.data?.id || event?.id || "";
  if (sessionId && sessions.has(sessionId)) {
    const current = sessions.get(sessionId);
    current.status = event?.type || "updated";
    current.updatedAt = new Date().toISOString();
    sessions.set(sessionId, current);
  }

  return res.status(200).json({ ok: true });
});

app.get("/api/wave/session/:id", (req, res) => {
  const item = sessions.get(req.params.id);
  if (!item) return res.status(404).json({ ok: false, message: "Session introuvable." });
  return res.json({ ok: true, session: item });
});

app.post("/api/backup", (req, res) => {
  const payload = req.body || {};
  backups.unshift({
    id: `bkp_${Date.now()}`,
    createdAt: new Date().toISOString(),
    payload
  });
  if (backups.length > 40) backups.length = 40;
  return res.json({ ok: true, count: backups.length });
});

app.get("/api/backup/latest", (req, res) => {
  if (!backups.length) return res.status(404).json({ ok: false, message: "Aucune sauvegarde." });
  return res.json({ ok: true, backup: backups[0] });
});

async function sendResetEmail(toEmail, resetUrl) {
  if (!RESEND_API_KEY || !RESET_FROM_EMAIL) {
    return { ok: false, message: "SMTP email non configure (RESEND_API_KEY/RESET_FROM_EMAIL)." };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: RESET_FROM_EMAIL,
      to: [toEmail],
      subject: "Reinitialisation de votre mot de passe AGENT PREMIUM",
      html: `<p>Bonjour,</p><p>Cliquez ici pour reinitialiser votre mot de passe:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Ce lien expire dans 30 minutes.</p>`
    })
  });
  if (!response.ok) {
    const err = await response.text();
    return { ok: false, message: err || "Echec envoi email." };
  }
  return { ok: true };
}

app.post("/api/auth/request-reset", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ ok: false, message: "Email requis." });
  }
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = Date.now() + (30 * 60 * 1000);
  resetTokens.set(token, { email, expiresAt });
  const base = FRONTEND_BASE_URL || `${req.protocol}://${req.get("host")}`;
  const resetUrl = `${base.replace(/\/$/, "")}/login.html?reset_token=${token}&email=${encodeURIComponent(email)}`;
  const send = await sendResetEmail(email, resetUrl);
  if (!send.ok) {
    return res.status(500).json({ ok: false, message: send.message });
  }
  return res.json({ ok: true, message: "Email de reinitialisation envoye." });
});

app.post("/api/auth/verify-reset-token", (req, res) => {
  const token = String(req.body?.token || "");
  const email = String(req.body?.email || "").trim().toLowerCase();
  const entry = resetTokens.get(token);
  if (!entry || entry.email !== email || Date.now() > entry.expiresAt) {
    return res.status(400).json({ ok: false, message: "Lien invalide ou expire." });
  }
  return res.json({ ok: true });
});

app.post("/api/auth/consume-reset-token", (req, res) => {
  const token = String(req.body?.token || "");
  const email = String(req.body?.email || "").trim().toLowerCase();
  const entry = resetTokens.get(token);
  if (!entry || entry.email !== email || Date.now() > entry.expiresAt) {
    return res.status(400).json({ ok: false, message: "Lien invalide ou expire." });
  }
  resetTokens.delete(token);
  return res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Payment backend running on :${PORT}`);
});
