(function () {
  const cfg = window.APP_CONFIG || {};

  async function notifyOrder(eventType, payload) {
    const webhook = cfg.notificationWebhook || "";
    if (!webhook) return { ok: false, message: "Webhook non configure." };
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          payload,
          source: "agent-premium"
        })
      });
      return { ok: res.ok };
    } catch (error) {
      return { ok: false, message: String(error) };
    }
  }

  function getPaymentLink(method) {
    const links = (cfg.paymentLinks || {});
    const key = method === "Orange Money" ? "orange" : method === "MTN MoMo" ? "mtn" : "wave";
    return links[key] || "";
  }

  window.NotificationService = {
    notifyOrder,
    getPaymentLink
  };
})();
