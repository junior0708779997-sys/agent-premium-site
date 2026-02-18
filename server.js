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
const backups = [];

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

app.listen(PORT, () => {
  console.log(`Payment backend running on :${PORT}`);
});
