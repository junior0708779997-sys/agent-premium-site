/* ================= MENU MOBILE ================= */
const menuToggle = document.getElementById("menu-toggle");
const navLinks = document.getElementById("nav-links");

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("active");
  });
}

document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("active");
  });
});

/* ================= CONFIG PROMO ================= */
const PROMO_START_HOUR = 9; // début promo à 9h
const PROMO_END_HOUR = 18;  // fin promo à 18h
const PROMO_DISCOUNT = 12;  // pourcentage de réduction

/* ================= OUTILS ================= */
function isPromoActive() {
  const hour = new Date().getHours();
  return hour >= PROMO_START_HOUR && hour < PROMO_END_HOUR;
}

/* ================= PRIX PROMO ================= */
function applyPrices() {
  const extractAmount = (text) => {
    const match = String(text || "").match(/\d[\d\s]*/);
    if (!match) return 0;
    return parseInt(match[0].replace(/\s/g, ""), 10) || 0;
  };

  const extractSuffix = (text) => {
    const raw = String(text || "").toLowerCase();
    if (raw.includes("/ 3 mois")) return " / 3 mois";
    if (raw.includes("/ mois")) return " / mois";
    return "";
  };

  document.querySelectorAll(".product-card").forEach(card => {
    const priceEl = card.querySelector(".price");
    if (!priceEl) return;

    const rawText = priceEl.textContent || "";
    const suffix = priceEl.dataset.suffix || extractSuffix(rawText);
    const originalPrice = parseInt(priceEl.dataset.original || extractAmount(rawText), 10);

    if (!originalPrice) return;

    priceEl.dataset.original = originalPrice;
    priceEl.dataset.suffix = suffix;

    if (isPromoActive()) {
      const promoPrice = Math.floor(
        originalPrice * (1 - PROMO_DISCOUNT / 100)
      );

      priceEl.innerHTML = `
        <span class="price-old">${originalPrice.toLocaleString("fr-FR")} FCFA${suffix}</span><br>
        <span class="price-new">${promoPrice.toLocaleString("fr-FR")} FCFA${suffix} 🔥</span>
      `;
    } else {
      priceEl.textContent = `${originalPrice.toLocaleString("fr-FR")} FCFA${suffix}`;
    }
  });
}

/* ================= COMPTEUR PROMO ================= */
function startCountdown() {
  const display = document.getElementById("countdown");
  if (!display) return;

  setInterval(() => {
    if (!isPromoActive()) {
      display.textContent = "Promo terminée";
      updateUrgencyPromoState(false);
      return;
    }

    updateUrgencyPromoState(true);
    const now = new Date();
    const end = new Date();
    end.setHours(PROMO_END_HOUR, 0, 0, 0);

    const diff = end - now;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    display.textContent =
      `${String(h).padStart(2, "0")}:` +
      `${String(m).padStart(2, "0")}:` +
      `${String(s).padStart(2, "0")}`;
  }, 1000);
}

let promoStock = 24;
function updateUrgencyPromoState(isActive) {
  const banner = document.getElementById("urgency-banner");
  const status = document.getElementById("urgency-status");
  const stock = document.getElementById("promo-stock");
  if (!banner || !status || !stock) return;

  if (isActive) {
    banner.classList.add("show");
    status.textContent = "🔥 Promo active maintenant: places limitees";
    stock.textContent = String(promoStock);
  } else {
    banner.classList.remove("show");
    status.textContent = "Promo terminee pour aujourd'hui";
  }
}

function initializeUrgencyMode() {
  const initial = Math.max(12, Math.floor(Math.random() * 20) + 12);
  promoStock = initial;
  updateUrgencyPromoState(isPromoActive());

  setInterval(() => {
    if (!isPromoActive()) return;
    if (promoStock > 3) {
      promoStock -= Math.random() > 0.5 ? 1 : 0;
      const stock = document.getElementById("promo-stock");
      if (stock) stock.textContent = String(promoStock);
    }
  }, 45000);
}

/* ================= WAVE ================= */
function toggleWaveButtons() {
  document.querySelectorAll(".wave-btn").forEach(btn => {
    btn.disabled = !isPromoActive();
    btn.classList.toggle("disabled", !isPromoActive());
    btn.textContent = isPromoActive()
      ? "Payer avec Wave"
      : "Wave disponible uniquement en promo";
  });
}

/* ================= WHATSAPP CHATBOT AVANCÉ ================= */
let quickCheckoutState = {
  mode: "single",
  items: [],
  productName: "",
  amount: 0,
  payment: "Wave",
  customerName: "",
  customerPhone: ""
};
let preferredCheckoutPayment = "Wave";
let currentCheckoutOrderId = "";
const CONVERSION_KEY = "ap_conversion_funnel_v1";
let conversionFunnel = (() => {
  try {
    return JSON.parse(localStorage.getItem(CONVERSION_KEY)) || {
      page_views: 0,
      add_to_cart: 0,
      start_checkout: 0,
      payment_opened: 0,
      order_confirmed: 0
    };
  } catch {
    return {
      page_views: 0,
      add_to_cart: 0,
      start_checkout: 0,
      payment_opened: 0,
      order_confirmed: 0
    };
  }
})();

const PRODUCT_SUGGESTIONS = {
  "Netflix Premium": ["Spotify Premium", "YouTube Premium"],
  "Spotify Premium": ["Deezer Premium", "YouTube Premium"],
  "Canva Pro": ["Capcut Pro", "Adobe Pro 3 mois"],
  "Adobe Pro 3 mois": ["Canva Pro", "Figma"],
  "ChatGPT Plus": ["Microsoft 365", "Canva Pro"],
  "YouTube Premium": ["Netflix Premium", "Amazon Prime Video"],
  "Amazon Prime Video": ["Disney+", "YouTube Premium"],
  "Crunchyroll Premium": ["Netflix Premium", "Spotify Premium"],
  "Deezer Premium": ["Spotify Premium", "YouTube Premium"],
  "Microsoft 365": ["ChatGPT Plus", "Canva Pro"]
};

function persistConversionFunnel() {
  localStorage.setItem(CONVERSION_KEY, JSON.stringify(conversionFunnel));
}

function trackFunnel(eventName) {
  if (!(eventName in conversionFunnel)) return;
  conversionFunnel[eventName] += 1;
  persistConversionFunnel();
}

function isMaintenanceMode() {
  return localStorage.getItem("ap_maintenance_mode") === "1";
}

function getActiveUser() {
  if (window.AgentAuth && typeof window.AgentAuth.getCurrentUser === 'function') {
    return window.AgentAuth.getCurrentUser();
  }
  return currentUser || null;
}

function recordOrderForActiveUser(paymentMethod, amount, items) {
  if (!window.AgentAuth || typeof window.AgentAuth.recordOrder !== 'function') return;
  const user = window.AgentAuth.getCurrentUser();
  if (!user) return null;
  return window.AgentAuth.recordOrder({
    totalAmount: amount,
    paymentMethod: paymentMethod,
    items: items
  });
}

function parseProductInfo(product, fallbackAmount = 0) {
  const cleaned = String(product || "").trim();
  const amountFromText = parseInt(cleaned.replace(/\D/g, ""), 10) || fallbackAmount || 0;
  const nameFromText = cleaned.split(" - ")[0]?.trim() || cleaned || "Compte premium";
  return {
    name: nameFromText,
    amount: amountFromText
  };
}

function openQuickCheckout(productName, amount = 0, preferredPayment = "", items = [], mode = "single") {
  if (isMaintenanceMode()) {
    alert("Le site est actuellement en maintenance. Reessayez dans quelques instants.");
    return;
  }
  const modal = document.getElementById("quick-checkout-modal");
  if (!modal) return;
  quickCheckoutState = {
    mode: mode,
    items: items,
    productName: productName || "Compte premium",
    amount: amount || 0,
    payment: preferredPayment || "Wave",
    customerName: "",
    customerPhone: ""
  };
  modal.classList.add("show");
  trackFunnel("start_checkout");
  renderQuickCheckoutStep(1);
}

function closeQuickCheckout() {
  const modal = document.getElementById("quick-checkout-modal");
  if (modal) {
    modal.classList.remove("show");
  }
}

function openCartCheckout(preferredPayment = "") {
  if (!Array.isArray(cart) || cart.length === 0) {
    alert("Votre panier est vide.");
    return;
  }
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const items = cart.map(item => ({
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.price
  }));
  openQuickCheckout("Commande panier", total, preferredPayment || preferredCheckoutPayment, items, "cart");
}

function renderQuickCheckoutStep(step) {
  const content = document.getElementById("quick-checkout-content");
  const indicator = document.getElementById("step-indicator");
  const progress = document.getElementById("quick-progress-fill");
  if (!content || !indicator) return;
  const mobileCompact = window.innerWidth <= 640;
  indicator.textContent = `Etape ${step}/3`;
  if (progress) {
    progress.style.width = step === 1 ? "33%" : step === 2 ? "66%" : "100%";
  }

  if (step === 1) {
    const itemsBlock = quickCheckoutState.mode === "cart" && quickCheckoutState.items.length > 0
      ? `<div class="quick-cart-lines">${quickCheckoutState.items.map(item =>
          `<p>- ${item.name} x${item.quantity} (${(item.unitPrice * item.quantity).toLocaleString()} FCFA)</p>`
        ).join("")}</div>`
      : `<p>Produit: <strong>${quickCheckoutState.productName}</strong></p>`;

    content.innerHTML = mobileCompact
      ? `
      <h3>Paiement rapide mobile</h3>
      ${itemsBlock}
      <p>Montant: <strong>${quickCheckoutState.amount.toLocaleString('fr-FR')} FCFA</strong></p>
      <div class="quick-payment-options">
        <button onclick="setQuickPayment('Wave')">Wave</button>
        <button onclick="setQuickPayment('Orange Money')">Orange Money</button>
        <button onclick="setQuickPayment('MTN MoMo')">MTN MoMo</button>
      </div>
      <div class="quick-form">
        <input id="quick-name" type="text" placeholder="Votre nom complet" value="${quickCheckoutState.customerName}" required>
        <input id="quick-phone" type="text" placeholder="Numero WhatsApp (optionnel)" value="${quickCheckoutState.customerPhone}">
      </div>
      <button class="quick-next" onclick="quickMobileContinue()">Passer a la confirmation</button>
    `
      : `
      <h3>Choisir le paiement</h3>
      ${itemsBlock}
      <p>Montant: <strong>${quickCheckoutState.amount.toLocaleString('fr-FR')} FCFA</strong></p>
      <div class="quick-payment-options">
        <button onclick="setQuickPayment('Wave')">Wave</button>
        <button onclick="setQuickPayment('Orange Money')">Orange Money</button>
        <button onclick="setQuickPayment('MTN MoMo')">MTN MoMo</button>
      </div>
      <button class="quick-next" onclick="renderQuickCheckoutStep(2)">Continuer</button>
    `;
    highlightSelectedPayment();
  } else if (step === 2) {
    content.innerHTML = `
      <h3>Informations client</h3>
      <div class="quick-form">
        <input id="quick-name" type="text" placeholder="Votre nom complet" value="${quickCheckoutState.customerName}" required>
        <input id="quick-phone" type="text" placeholder="Numero WhatsApp (optionnel)" value="${quickCheckoutState.customerPhone}">
      </div>
      <button class="quick-next" onclick="saveQuickCustomer()">Continuer</button>
    `;
  } else {
    const recapLines = quickCheckoutState.mode === "cart" && quickCheckoutState.items.length > 0
      ? quickCheckoutState.items.map(item => `<p><strong>${item.name}</strong> x${item.quantity}</p>`).join("")
      : `<p><strong>Produit:</strong> ${quickCheckoutState.productName}</p>`;

    const payNowBtn = (window.NotificationService && typeof window.NotificationService.getPaymentLink === 'function' && window.NotificationService.getPaymentLink(quickCheckoutState.payment))
      ? `<button class="quick-next" onclick="openConfiguredPaymentLink()" style="margin-top:6px;background:#0f5f9a;">Payer maintenant (${quickCheckoutState.payment})</button>`
      : '';

    content.innerHTML = `
      <h3>Confirmation</h3>
      ${recapLines}
      <p><strong>Montant:</strong> ${quickCheckoutState.amount.toLocaleString()} FCFA</p>
      <p><strong>Paiement:</strong> ${quickCheckoutState.payment}</p>
      <p><strong>Client:</strong> ${quickCheckoutState.customerName || "Non renseigne"}</p>
      <button class="quick-next" onclick="confirmQuickCheckout()">Confirmer sur WhatsApp</button>
      ${payNowBtn}
      <button class="quick-next" onclick="closeQuickCheckout()" style="margin-top:6px;background:#edf5ff;color:#1f3559;border:1px solid #d7e1f0;">Continuer mes achats</button>
    `;
  }
}

function openConfiguredPaymentLink() {
  const cfg = window.APP_CONFIG || {};
  const apiBase = String(cfg.apiBaseUrl || "").trim();
  if (apiBase) {
    fetch(`${apiBase.replace(/\/$/, "")}/api/wave/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: currentCheckoutOrderId || "",
        amount: quickCheckoutState.amount,
        paymentMethod: quickCheckoutState.payment,
        currency: "XOF",
        items: quickCheckoutState.items || [],
        customerName: quickCheckoutState.customerName || "",
        customerPhone: quickCheckoutState.customerPhone || "",
        successUrl: `${window.location.origin}/index.html?payment=success`,
        errorUrl: `${window.location.origin}/index.html?payment=error`
      })
    }).then(res => res.json())
      .then(data => {
        if (data && data.launchUrl) {
          trackFunnel("payment_opened");
          window.open(data.launchUrl, "_blank");
          return;
        }
        const fallbackLink = window.NotificationService && typeof window.NotificationService.getPaymentLink === 'function'
          ? window.NotificationService.getPaymentLink(quickCheckoutState.payment)
          : "";
        if (fallbackLink) window.open(fallbackLink, "_blank");
      }).catch(() => {
        const fallbackLink = window.NotificationService && typeof window.NotificationService.getPaymentLink === 'function'
          ? window.NotificationService.getPaymentLink(quickCheckoutState.payment)
          : "";
        if (fallbackLink) window.open(fallbackLink, "_blank");
      });
    return;
  }
  if (window.NotificationService && typeof window.NotificationService.getPaymentLink === 'function') {
    const link = window.NotificationService.getPaymentLink(quickCheckoutState.payment);
    if (link) {
      trackFunnel("payment_opened");
      window.open(link, '_blank');
    }
  }
}

function setQuickPayment(method) {
  quickCheckoutState.payment = method;
  highlightSelectedPayment();
}

function highlightSelectedPayment() {
  const buttons = document.querySelectorAll(".quick-payment-options button");
  buttons.forEach(btn => {
    btn.classList.toggle("selected", btn.textContent === quickCheckoutState.payment);
  });
}

function saveQuickCustomer() {
  const nameInput = document.getElementById("quick-name");
  const phoneInput = document.getElementById("quick-phone");
  quickCheckoutState.customerName = nameInput ? nameInput.value.trim() : "";
  quickCheckoutState.customerPhone = phoneInput ? phoneInput.value.trim() : "";
  renderQuickCheckoutStep(3);
}

function quickMobileContinue() {
  saveQuickCustomer();
}

function confirmQuickCheckout() {
  const phone = "2250708779997";
  const orderItems = quickCheckoutState.mode === "cart" && quickCheckoutState.items.length > 0
    ? quickCheckoutState.items
    : [{ name: quickCheckoutState.productName, quantity: 1, unitPrice: quickCheckoutState.amount }];
  const itemsText = orderItems.map(item =>
    `- ${item.name} x${item.quantity} = ${(item.unitPrice * item.quantity).toLocaleString()} FCFA`
  ).join("\n");
  const recordResult = recordOrderForActiveUser(quickCheckoutState.payment, quickCheckoutState.amount, orderItems);
  currentCheckoutOrderId = recordResult && recordResult.ok && recordResult.order ? recordResult.order.id : "";
  trackFunnel("order_confirmed");
  const orderIdLine = recordResult && recordResult.ok && recordResult.order
    ? `- ID commande: ${recordResult.order.id}`
    : "- ID commande: (invite)";
  const message = `
Bonjour AGENT PREMIUM,

Je confirme ma commande:
${itemsText}
${orderIdLine}
- Montant: ${quickCheckoutState.amount.toLocaleString()} FCFA
- Paiement choisi: ${quickCheckoutState.payment}
- Nom client: ${quickCheckoutState.customerName || "Non renseigne"}
- Contact client: ${quickCheckoutState.customerPhone || "Non renseigne"}

Merci de m'envoyer la procedure finale.
`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  if (window.NotificationService && typeof window.NotificationService.notifyOrder === 'function') {
    window.NotificationService.notifyOrder("order_confirmed", {
      orderId: (recordResult && recordResult.ok && recordResult.order) ? recordResult.order.id : "",
      payment: quickCheckoutState.payment,
      amount: quickCheckoutState.amount,
      customerName: quickCheckoutState.customerName || "",
      customerPhone: quickCheckoutState.customerPhone || "",
      items: orderItems
    }).catch(() => {});
  }
  if (recordResult && recordResult.ok && recordResult.order && window.AgentAuth && typeof window.AgentAuth.updateOrderStatus === 'function') {
    const id = recordResult.order.id;
    setTimeout(() => {
      window.AgentAuth.updateOrderStatus(id, "payee");
      renderAccountOrders();
      renderAdminOrders();
    }, 8000);
    setTimeout(() => {
      window.AgentAuth.updateOrderStatus(id, "livree");
      renderAccountOrders();
      renderAdminOrders();
    }, 20000);
  }
  if (quickCheckoutState.mode === "cart") {
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
    preferredCheckoutPayment = "Wave";
  }
  closeQuickCheckout();
  renderAccountOrders();
  renderAdminOrders();
}

function openCartPanel() {
  const cartWidget = document.getElementById('cart-widget');
  if (cartWidget) {
    cartWidget.classList.add('show');
  }
}

function orderProduct(product) {
  const parsed = parseProductInfo(product);
  addToCart(parsed.name, parsed.amount);
  openCartPanel();
}

function payWithWave(product, amount) {
  const parsed = parseProductInfo(product, amount);
  addToCart(parsed.name, parsed.amount);
  preferredCheckoutPayment = "Wave";
  openCartPanel();
}

// Fonction pour envoyer un message de support
function sendSupportMessage() {
  const phone = "2250708779997";
  const message = "Bonjour AGENT PREMIUM, j'ai besoin d'aide avec mon compte.";

  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    "_blank"
  );
}

// Fonction pour demander des informations sur les promos
function askPromoInfo() {
  const phone = "2250708779997";
  const message = "Bonjour, pouvez-vous me donner plus d'informations sur vos promotions actuelles ?";

  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    "_blank"
  );
}

// Fonction pour signaler un problème
function reportIssue() {
  const phone = "2250708779997";
  const message = "Bonjour, j'ai un problème avec mon compte. Pouvez-vous m'aider ?";

  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    "_blank"
  );
}

/* ================= LANCEMENT ================= */
try {
  applyPrices();
  startCountdown();
  toggleWaveButtons();

  // Optimisation : vérifier la promo toutes les minutes au lieu de recalculer les prix
  let lastPromoState = isPromoActive();
  setInterval(() => {
    const currentPromoState = isPromoActive();
    if (currentPromoState !== lastPromoState) {
      applyPrices();
      toggleWaveButtons();
      lastPromoState = currentPromoState;
    }
  }, 60000);
} catch (error) {
  console.error("Erreur lors de l'initialisation du script :", error);
}

document.querySelectorAll(".faq-item h3").forEach(title => {
  title.addEventListener("click", () => {
    title.parentElement.classList.toggle("active");
  });
});

/* ================= ANIMATION AU SCROLL ================= */
const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll(".fade-up").forEach(el => {
  observer.observe(el);
});

/* ================= HEADER AU SCROLL ================= */
window.addEventListener("scroll", () => {
  const header = document.querySelector(".navbar");
  if (window.scrollY > 60) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
});

/* ================= VALIDATION FORMULAIRE ================= */
function validateForm(form) {
  const inputs = form.querySelectorAll("input, textarea");
  let isValid = true;

  inputs.forEach(input => {
    if (input.hasAttribute("required") && !input.value.trim()) {
      input.classList.add("error");
      isValid = false;
    } else {
      input.classList.remove("error");
    }

    // Validation email
    if (input.type === "email" && input.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.value)) {
        input.classList.add("error");
        isValid = false;
      }
    }
  });

  return isValid;
}

// Appliquer validation aux formulaires
document.addEventListener("DOMContentLoaded", () => {
  const forms = document.querySelectorAll("form");
  forms.forEach(form => {
    form.addEventListener("submit", (e) => {
      if (!validateForm(form)) {
        e.preventDefault();
        alert("Veuillez remplir tous les champs requis correctement.");
      }
    });
  });
});

/* ================= MULTILANGUE ================= */
const translations = {
  fr: {
    title: "AGENT PREMIUM – Netflix, Spotify, Canva & Disney+ à prix réduit",
    heroTitle: "Accédez à Netflix, Spotify, Canva, Disney+ et plus encore",
    heroDesc: "Comptes testés, livraison rapide et assistance WhatsApp 24h/24.",
    productsTitle: "Nos comptes premium",
    contactTitle: "Contact",
    whatsapp: "WhatsApp : +225 07 08 77 99 97",
    cta: "Besoin d'un compte premium ?",
    ctaDesc: "Contactez-nous maintenant et recevez votre compte rapidement.",
    orderBtn: "Commander sur WhatsApp",
    buyBtn: "Acheter",
    waveBtn: "Payer avec Wave",
    reviewsTitle: "Avis de nos clients",
    faqTitle: "Questions fréquentes",
    conditionsTitle: "Conditions d'utilisation",
    paymentTitle: "Comment payer ?"
  },
  en: {
    title: "AGENT PREMIUM – Netflix, Spotify, Canva & Disney+ at reduced prices",
    heroTitle: "Access Netflix, Spotify, Canva, Disney+ and more",
    heroDesc: "Tested accounts, fast delivery and 24/7 WhatsApp support.",
    productsTitle: "Our premium accounts",
    contactTitle: "Contact",
    whatsapp: "WhatsApp: +225 07 08 77 99 97",
    cta: "Need a premium account?",
    ctaDesc: "Contact us now and receive your account quickly.",
    orderBtn: "Order on WhatsApp",
    buyBtn: "Buy",
    waveBtn: "Pay with Wave",
    reviewsTitle: "Customer reviews",
    faqTitle: "Frequently asked questions",
    conditionsTitle: "Terms of use",
    paymentTitle: "How to pay?"
  }
};

let currentLang = 'fr';

function toggleLanguage() {
  currentLang = currentLang === 'fr' ? 'en' : 'fr';
  const langToggle = document.getElementById('lang-toggle');
  if (langToggle) {
    langToggle.textContent = currentLang.toUpperCase();
  }
  updateLanguage();
}

function updateLanguage() {
  const t = translations[currentLang];
  const heroTitle = document.querySelector('h1');
  const heroDesc = document.querySelector('.hero-text p:not(.seo-text)');
  const productsTitle = document.querySelector('#products h2');
  const contactTitle = document.querySelector('#contact h2');
  const contactText = document.querySelector('#contact p');
  const ctaTitle = document.querySelector('.final-cta h2');
  const ctaDesc = document.querySelector('.final-cta p');
  const ctaBtn = document.querySelector('.cta-btn');
  const reviewsTitle = document.querySelector('.reviews h2');
  const faqTitle = document.querySelector('.faq h2');
  const conditionsTitle = document.querySelector('.conditions h2');
  const paymentTitle = document.querySelector('.payment-info h2');

  document.title = t.title;
  if (heroTitle) heroTitle.textContent = t.heroTitle;
  if (heroDesc) heroDesc.textContent = t.heroDesc;
  if (productsTitle) productsTitle.textContent = t.productsTitle;
  if (contactTitle) contactTitle.textContent = t.contactTitle;
  if (contactText) contactText.innerHTML = `📱 WhatsApp : <strong>+225 07 08 77 99 97</strong>`;
  if (ctaTitle) ctaTitle.textContent = t.cta;
  if (ctaDesc) ctaDesc.textContent = t.ctaDesc;
  if (ctaBtn) ctaBtn.textContent = `💬 ${t.orderBtn}`;
  if (reviewsTitle) reviewsTitle.textContent = t.reviewsTitle;
  if (faqTitle) faqTitle.textContent = t.faqTitle;
  if (conditionsTitle) conditionsTitle.textContent = t.conditionsTitle;
  if (paymentTitle) paymentTitle.textContent = t.paymentTitle;

  // Update buttons
  document.querySelectorAll('button:not(.wave-btn)').forEach(btn => {
    if (btn.textContent.includes('Acheter')) btn.textContent = t.buyBtn;
  });
  document.querySelectorAll('.wave-btn').forEach(btn => {
    btn.textContent = t.waveBtn;
  });
}

// Event listener for language toggle
document.addEventListener('DOMContentLoaded', () => {
  const langToggle = document.getElementById('lang-toggle');
  if (langToggle) {
    langToggle.addEventListener('click', toggleLanguage);
  }
});

/* ================= MODE SOMBRE ================= */
function toggleTheme() {
  const body = document.body;
  const themeBtn = document.getElementById('theme-toggle');
  if (!themeBtn) return;

  body.classList.toggle('dark-mode');

  // Sauvegarder la préférence
  const isDark = body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');

  // Mettre à jour l'icône
  themeBtn.textContent = isDark ? '☀️' : '🌙';
}

// Charger le thème sauvegardé
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  const themeBtn = document.getElementById('theme-toggle');
  if (!themeBtn) return;

  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeBtn.textContent = '☀️';
  } else {
    themeBtn.textContent = '🌙';
  }

  themeBtn.addEventListener('click', toggleTheme);
});

/* ================= NOTIFICATIONS PUSH ================= */
function requestNotificationPermission() {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('Notifications autorisées');
      }
    });
  }
}

// Demander la permission au chargement
document.addEventListener('DOMContentLoaded', () => {
  requestNotificationPermission();
});

// Fonction pour envoyer une notification push
function sendPushNotification(title, body) {
  if ('serviceWorker' in navigator && 'Notification' in window) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        body: body,
        icon: '/images/1691829400logo-canva-png.png',
        badge: '/images/1691829400logo-canva-png.png',
        vibrate: [200, 100, 200],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: 1
        }
      });
    });
  }
}

/* ================= OPTIMISATION MOBILE ================= */
function optimizeForMobile() {
  // Détection du mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    // Optimisations pour mobile
    document.body.classList.add('mobile-optimized');

    // Précharger les images importantes
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => {
      img.src = img.dataset.src;
    });

    // Désactiver les animations lourdes sur mobile
    document.querySelectorAll('.fade-up').forEach(el => {
      el.style.animation = 'none';
      el.style.opacity = '1';
    });
  }
}

/* ================= SYSTÈME DE NOTATION ================= */
function initializeRatings() {
  document.querySelectorAll('.stars').forEach(starsContainer => {
    const rating = parseFloat(starsContainer.dataset.rating);
    const stars = starsContainer.querySelectorAll('.star');

    // Remplir les étoiles selon la note
    stars.forEach((star, index) => {
      if (index < Math.floor(rating)) {
        star.classList.add('active');
      } else if (index === Math.floor(rating) && rating % 1 !== 0) {
        star.classList.add('active');
        star.style.opacity = '0.5'; // Demi-étoile
      }
    });

    // Interaction au clic
    stars.forEach((star, index) => {
      star.addEventListener('click', () => {
        // Ici vous pourriez envoyer la note au serveur
        console.log(`Note donnée: ${index + 1} étoiles`);
        sendPushNotification('Merci !', 'Votre avis a été enregistré.');
      });
    });
  });
}

/* ================= FIDÉLITÉ ================= */
let userPoints = parseInt(localStorage.getItem('userPoints')) || 0;
let userTier = getUserTier(userPoints);

function getUserTier(points) {
  if (points >= 1000) return 'Or';
  if (points >= 500) return 'Argent';
  return 'Bronze';
}

function addPoints(points) {
  userPoints += points;
  localStorage.setItem('userPoints', userPoints);
  updateLoyaltyDisplay();
  checkTierUpgrade();
}

function updateLoyaltyDisplay() {
  const pointsDisplay = document.getElementById('user-points');
  const tierDisplay = document.getElementById('user-tier');

  if (pointsDisplay) pointsDisplay.textContent = userPoints;
  if (tierDisplay) tierDisplay.textContent = userTier;
}

function checkTierUpgrade() {
  const newTier = getUserTier(userPoints);
  if (newTier !== userTier) {
    userTier = newTier;
    sendPushNotification('Félicitations !', `Vous êtes passé au niveau ${userTier} !`);
  }
}

/* ================= GÉOLOCALISATION ================= */
function detectLocation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude, longitude } = position.coords;

      // Simulation de détection de pays (en production, utiliser une API)
      fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=fr`)
        .then(response => response.json())
        .then(data => {
          const country = data.countryName;
          showLocationBanner(country);
          adaptPaymentMethods(country);
        })
        .catch(() => {
          console.log('Géolocalisation non disponible');
        });
    });
  }
}

function showLocationBanner(country) {
  const banner = document.getElementById('location-banner');
  if (banner) {
    banner.textContent = `🇨🇮 Vous êtes en ${country} - Offres spéciales disponibles !`;
    banner.classList.add('show');
    setTimeout(() => banner.classList.remove('show'), 5000);
  }
}

function adaptPaymentMethods(country) {
  // Adapter les méthodes de paiement selon le pays
  const waveBtn = document.querySelector('.wave-btn');
  if (country === 'Côte d\'Ivoire' && waveBtn) {
    waveBtn.style.display = 'block';
  }
}

/* ================= PAIEMENTS ================= */
function initializePayments() {
  document.querySelectorAll('.payment-method').forEach(method => {
    method.addEventListener('click', () => {
      document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
      method.classList.add('selected');

      const paymentType = method.dataset.type;
      console.log(`Méthode de paiement sélectionnée: ${paymentType}`);

      // Ici intégrer l'API de paiement (Stripe, PayPal, etc.)
      if (paymentType === 'stripe') {
        // Intégration Stripe
        console.log('Redirection vers Stripe...');
      } else if (paymentType === 'paypal') {
        // Intégration PayPal
        console.log('Redirection vers PayPal...');
      }
    });
  });
}

/* ================= ANALYTICS AVANCÉS ================= */
let analyticsData = {
  pageViews: 0,
  clicks: 0,
  timeOnPage: 0,
  scrollDepth: 0
};

function trackAnalytics() {
  // Suivi des vues de page
  analyticsData.pageViews++;

  // Suivi des clics
  document.addEventListener('click', (e) => {
    analyticsData.clicks++;
    updateAnalyticsDisplay();
  });

  // Suivi du temps passé
  let startTime = Date.now();
  setInterval(() => {
    analyticsData.timeOnPage = Math.floor((Date.now() - startTime) / 1000);
    updateAnalyticsDisplay();
  }, 1000);

  // Suivi du scroll
  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset;
    const docHeight = document.body.offsetHeight - window.innerHeight;
    analyticsData.scrollDepth = Math.max(analyticsData.scrollDepth, Math.round((scrollTop / docHeight) * 100));
    updateAnalyticsDisplay();
  });
}

function updateAnalyticsDisplay() {
  const panel = document.getElementById('analytics-panel');
  if (panel) {
    panel.innerHTML = `
      <div class="analytics-metric">
        <span>Vues:</span>
        <span>${analyticsData.pageViews}</span>
      </div>
      <div class="analytics-metric">
        <span>Clics:</span>
        <span>${analyticsData.clicks}</span>
      </div>
      <div class="analytics-metric">
        <span>Temps:</span>
        <span>${analyticsData.timeOnPage}s</span>
      </div>
      <div class="analytics-metric">
        <span>Scroll:</span>
        <span>${analyticsData.scrollDepth}%</span>
      </div>
    `;
  }
}

/* ================= DASHBOARD CLIENT ================= */
function initializeClientDashboard() {
  const dashboard = document.getElementById('client-dashboard');
  const toggleBtn = document.getElementById('dashboard-toggle');

  if (toggleBtn && dashboard) {
    toggleBtn.addEventListener('click', () => {
      dashboard.classList.toggle('show');
    });
    // Fermer en cliquant à l'extérieur
    document.addEventListener('click', (e) => {
      if (!dashboard.contains(e.target) && !toggleBtn.contains(e.target)) {
        dashboard.classList.remove('show');
      }
    });
  }

  // Charger les données utilisateur (simulation)
  loadUserData();
}

function loadUserData() {
  // Simulation de données utilisateur
  const userAccounts = [
    { name: 'Netflix Premium', status: 'active', expiry: '2024-12-31' },
    { name: 'Spotify Premium', status: 'active', expiry: '2024-11-15' },
    { name: 'Canva Pro', status: 'expired', expiry: '2024-10-01' }
  ];

  const accountsList = document.getElementById('user-accounts');
  if (accountsList) {
    accountsList.innerHTML = userAccounts.map(account => `
      <div class="account-item">
        <span>${account.name}</span>
        <span class="account-status ${account.status}">${account.status === 'active' ? 'Actif' : 'Expiré'}</span>
      </div>
    `).join('');
  }
}

/* ================= LOADER ================= */
window.addEventListener("load", () => {
  const loader = document.querySelector(".loader");
  if (loader) {
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 400);
  }

  // Optimiser pour mobile après chargement
  optimizeForMobile();

  // Initialiser les nouvelles fonctionnalités
  initializeRatings();
  detectLocation();
  initializePayments();
  trackAnalytics();
  initializeClientDashboard();
  initializeTestimonialsSlider();
  initializeCookieBanner();

  // Initialize advanced features
  initializeAdvancedFeatures();
});

function initializeAdvancedFeatures() {
  // Add event listeners for new features
  document.addEventListener('click', (e) => {
    // Close modals when clicking outside
    if (e.target.classList.contains('auth-modal')) {
      e.target.classList.remove('show');
    }
    if (e.target.classList.contains('payment-modal')) {
      e.target.classList.remove('show');
    }
  });

  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.focus();
      }
    }
    if (e.key === 'Escape') {
      // Close open modals/widgets
      document.querySelectorAll('.show').forEach(el => {
        if (el.id !== 'cookie-banner') el.classList.remove('show');
      });
    }
  });

  // Performance monitoring
  if ('performance' in window) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        console.log('Page load time:', perfData.loadEventEnd - perfData.fetchStart, 'ms');
      }, 0);
    });
  }

  // Offline mode detection
  window.addEventListener('online', () => {
    const offlineBanner = document.getElementById('offline-banner');
    if (offlineBanner) {
      offlineBanner.classList.remove('show');
    }
  });

  window.addEventListener('offline', () => {
    const offlineBanner = document.getElementById('offline-banner');
    if (offlineBanner) {
      offlineBanner.classList.add('show');
    }
  });

  // Initialize cart
  updateCartDisplay();

  // Initialize analytics panel toggle
  const analyticsPanel = document.getElementById('analytics-panel');
  if (analyticsPanel) {
    analyticsPanel.addEventListener('click', () => {
      analyticsPanel.classList.toggle('show');
    });
  }
}

/* ================= LIVE CHAT WIDGET ================= */
function toggleChat() {
  const chatWidget = document.getElementById('chat-widget');
  chatWidget.classList.toggle('show');
}

function closeChat() {
  document.getElementById('chat-widget').classList.remove('show');
}

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  addChatMessage('user', message);
  input.value = '';

  // Simulate bot response
  setTimeout(() => {
    const responses = [
      "Bonjour ! Comment puis-je vous aider ?",
      "Nous proposons des comptes premium Netflix, Spotify, Canva et Disney+.",
      "La livraison se fait immédiatement après paiement.",
      "Vous pouvez payer par Wave, Orange Money ou MTN MoMo.",
      "Contactez-nous sur WhatsApp pour plus d'informations."
    ];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    addChatMessage('bot', randomResponse);
  }, 1000);
}

function addChatMessage(type, text) {
  const messages = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = text;
  messages.appendChild(messageDiv);
  messages.scrollTop = messages.scrollHeight;
}

function handleChatKeyPress(event) {
  if (event.key === 'Enter') {
    sendChatMessage();
  }
}

function handleQuickChatTopic(topic) {
  const map = {
    prix: {
      user: "Je veux connaitre les prix disponibles.",
      bot: "Nos offres commencent a 1 500 FCFA. Dis-moi le service voulu et je te donne le prix exact."
    },
    livraison: {
      user: "Combien de temps pour la livraison ?",
      bot: "La livraison est generalement immediate, souvent en moins de 5 minutes apres paiement."
    },
    garantie: {
      user: "Quelle garantie proposez-vous ?",
      bot: "Tous les comptes sont testes. Assistance disponible en cas de probleme apres livraison."
    },
    paiement: {
      user: "Quels moyens de paiement acceptez-vous ?",
      bot: "Vous pouvez payer via Wave, Orange Money ou MTN MoMo."
    }
  };

  const item = map[topic];
  if (!item) return;
  addChatMessage('user', item.user);
  setTimeout(() => addChatMessage('bot', item.bot), 400);
}

/* ================= SHOPPING CART ================= */
let cart = JSON.parse(localStorage.getItem('cart')) || [];

function addToCart(productName, price) {
  if (isMaintenanceMode()) {
    alert("Maintenance en cours. Ajout au panier temporairement indisponible.");
    return;
  }
  const existingItem = cart.find(item => item.name === productName);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ name: productName, price: price, quantity: 1 });
  }
  localStorage.setItem('cart', JSON.stringify(cart));
  trackFunnel("add_to_cart");
  updateCartDisplay();
  sendPushNotification('Produit ajouté', `${productName} a été ajouté à votre panier.`);
}

function changeCartQuantity(index, delta) {
  const item = cart[index];
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    cart.splice(index, 1);
  }
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartDisplay();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartDisplay();
}

function updateCartDisplay() {
  const cartItems = document.getElementById('cart-items');
  const cartCount = document.getElementById('cart-count');
  const cartCountBadge = document.getElementById('cart-count-badge');
  const cartTotal = document.getElementById('cart-total');
  const floatingCheckout = document.getElementById('cart-checkout-floating');
  const suggestionsWrap = document.getElementById('cart-suggestions');

  if (cartItems) {
    cartItems.innerHTML = cart.map((item, index) => `
      <div class="cart-item">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <span>${item.price.toLocaleString()} FCFA / unite</span>
          <div class="cart-line-total">Sous-total: ${(item.price * item.quantity).toLocaleString()} FCFA</div>
          <div class="cart-qty-controls">
            <button class="qty-btn" onclick="changeCartQuantity(${index}, -1)" aria-label="Diminuer quantite">−</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn" onclick="changeCartQuantity(${index}, 1)" aria-label="Augmenter quantite">+</button>
          </div>
        </div>
        <button class="cart-remove-btn" onclick="removeFromCart(${index})" aria-label="Supprimer article">Supprimer</button>
      </div>
    `).join('');
  }

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (cartCount) cartCount.textContent = totalItems;
  if (cartCountBadge) cartCountBadge.textContent = totalItems;
  if (cartTotal) cartTotal.textContent = `${totalPrice.toLocaleString()} FCFA`;
  if (floatingCheckout) {
    floatingCheckout.classList.toggle('show', totalItems > 0);
    floatingCheckout.textContent = totalItems > 0
      ? `Passer au paiement (${totalItems})`
      : 'Passer au paiement';
  }

  if (suggestionsWrap) {
    const inCart = new Set(cart.map(i => i.name));
    const candidates = new Set();
    cart.forEach((item) => {
      (PRODUCT_SUGGESTIONS[item.name] || []).forEach((s) => {
        if (!inCart.has(s)) candidates.add(s);
      });
    });
    const list = Array.from(candidates).slice(0, 4);
    if (!list.length) {
      suggestionsWrap.classList.remove('show');
      suggestionsWrap.innerHTML = '';
    } else {
      suggestionsWrap.classList.add('show');
      suggestionsWrap.innerHTML = `
        <h4>Produits similaires</h4>
        <div class="cart-suggestion-list">
          ${list.map(name => `<button type="button" class="cart-suggestion-item" data-suggest="${name}">${name}</button>`).join('')}
        </div>
      `;
    }
  }
}

function toggleCart() {
  document.getElementById('cart-widget').classList.toggle('show');
}

function continueShopping() {
  const cartWidget = document.getElementById('cart-widget');
  if (cartWidget) cartWidget.classList.remove('show');
  const products = document.getElementById('products');
  if (products) products.scrollIntoView({ behavior: 'smooth' });
}

function checkout() {
  if (cart.length === 0) {
    alert('Votre panier est vide.');
    return;
  }
  openCartCheckout(preferredCheckoutPayment);
}

function getPriceFromCard(productName) {
  const cards = Array.from(document.querySelectorAll('.product-card'));
  const card = cards.find(c => (c.querySelector('h3')?.textContent || '').trim() === productName);
  if (!card) return 0;
  const text = card.querySelector('.price')?.textContent || '';
  return parseInt(text.replace(/[^\d]/g, ''), 10) || 0;
}

/* ================= PRODUCT SEARCH/FILTER ================= */
function filterProducts() {
  const searchInput = document.getElementById('search-input');
  const categoryInput = document.getElementById('category-filter');
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const categoryFilter = categoryInput ? categoryInput.value : '';
  const products = document.querySelectorAll('.product-card');

  products.forEach(product => {
    const name = product.querySelector('h3').textContent.toLowerCase();
    const category = (product.classList[1] || '').toLowerCase(); // e.g., 'netflix', 'spotify'
    const matchesSearch = name.includes(searchTerm);
    const matchesCategory = !categoryFilter || category === categoryFilter;

    if (matchesSearch && matchesCategory) {
      product.style.display = '';
    } else {
      product.style.display = 'none';
    }
  });
}

function sortProducts() {
  const container = document.getElementById('product-list');
  const sortSelect = document.getElementById('sort-products');
  if (!container || !sortSelect) return;

  const cards = Array.from(container.querySelectorAll('.product-card'));
  const mode = sortSelect.value;
  const parsePrice = (card) => {
    const text = card.querySelector('.price')?.textContent || '';
    return parseInt(text.replace(/\D/g, ''), 10) || 0;
  };

  if (mode === 'price-asc') {
    cards.sort((a, b) => parsePrice(a) - parsePrice(b));
  } else if (mode === 'price-desc') {
    cards.sort((a, b) => parsePrice(b) - parsePrice(a));
  } else if (mode === 'name-asc') {
    cards.sort((a, b) => {
      const aName = a.querySelector('h3')?.textContent || '';
      const bName = b.querySelector('h3')?.textContent || '';
      return aName.localeCompare(bName, 'fr');
    });
  }

  cards.forEach(card => container.appendChild(card));
}

function updateProductButtonLabels() {
  document.querySelectorAll('.product-card button').forEach(button => {
    const clickAction = button.getAttribute('onclick') || '';
    if (clickAction.includes('orderProduct(')) {
      button.textContent = 'Ajouter au panier';
    } else if (clickAction.includes('payWithWave(')) {
      button.textContent = 'Ajouter (Wave)';
    }
  });
}

function normalizeProductCopy() {
  const canonical = {
    'Capcut Pro': { title: 'CapCut Pro', desc: 'Editez vos videos comme un pro' },
    'Figma': { title: 'Figma Pro', desc: 'Design collaboratif professionnel' },
    'YouTube Premium': { title: 'YouTube Premium', desc: 'Sans pub • Lecture en arriere-plan' },
    'Amazon Prime Video': { title: 'Amazon Prime Video', desc: 'Films et series Prime Originals' },
    'ChatGPT Plus': { title: 'ChatGPT Plus', desc: 'IA rapide pour etudes, travail et business' },
    'Microsoft 365': { title: 'Microsoft 365', desc: 'Word, Excel, PowerPoint et 1 TB OneDrive' },
    'Crunchyroll Premium': { title: 'Crunchyroll Premium', desc: 'Animes HD sans pub' },
    'Deezer Premium': { title: 'Deezer Premium', desc: 'Musique illimitee sans pub' },
    'Spotify Premium': { title: 'Spotify Premium', desc: 'Sans pub • Mode hors connexion' }
  };

  document.querySelectorAll('.product-card').forEach(card => {
    const titleEl = card.querySelector('h3');
    const descEl = card.querySelector('p');
    if (!titleEl || !descEl) return;
    const current = titleEl.textContent.trim();
    const normalized = canonical[current];
    if (normalized) {
      titleEl.textContent = normalized.title;
      descEl.textContent = normalized.desc;
    }
  });
}

/* ================= USER AUTHENTICATION ================= */
let currentUser = (window.AgentAuth && typeof window.AgentAuth.getCurrentUser === 'function')
  ? window.AgentAuth.getCurrentUser()
  : JSON.parse(localStorage.getItem('currentUser')) || null;

function showAuthModal(isLogin = true) {
  const modal = document.getElementById('auth-modal') || createAuthModal();
  const form = modal.querySelector('.auth-form');
  form.querySelector('h3').textContent = isLogin ? 'Connexion' : 'Inscription';
  form.querySelector('.switch-auth').textContent = isLogin ? 'Créer un compte' : 'Se connecter';
  form.querySelector('.switch-auth').onclick = () => showAuthModal(!isLogin);
  modal.classList.add('show');
}

function createAuthModal() {
  const modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.className = 'auth-modal';
  modal.innerHTML = `
    <div class="auth-form">
      <h3>Connexion</h3>
      <form onsubmit="handleAuth(event)">
        <div class="form-group">
          <input type="email" placeholder="Email" required>
        </div>
        <div class="form-group">
          <input type="password" placeholder="Mot de passe" required>
        </div>
        <button type="submit">Se connecter</button>
      </form>
      <div class="switch-auth" onclick="showAuthModal(false)">Créer un compte</div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

async function handleAuth(event) {
  event.preventDefault();
  const email = event.target.querySelector('input[type="email"]').value;
  const password = event.target.querySelector('input[type="password"]').value;
  const isLoginMode = event.target.querySelector('h3').textContent.includes('Connexion');
  let result = { ok: false, message: 'Action impossible.' };

  if (window.AgentAuth) {
    if (isLoginMode && typeof window.AgentAuth.loginEmail === 'function') {
      result = await window.AgentAuth.loginEmail(email, password);
    } else if (!isLoginMode && typeof window.AgentAuth.registerEmail === 'function') {
      result = await window.AgentAuth.registerEmail(email.split('@')[0], email, password);
    }
  }

  if (result.ok) {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('show');
    updateUserDisplay();
    const activeUser = getActiveUser();
    if (activeUser) {
      sendPushNotification('Bienvenue !', `Bienvenue ${activeUser.name || activeUser.email} !`);
    }
    return;
  }
  alert(result.message || 'Impossible de se connecter.');
}

function logout() {
  if (window.AgentAuth && typeof window.AgentAuth.logout === 'function') {
    window.AgentAuth.logout();
  }
  currentUser = null;
  updateUserDisplay();
}

function updateUserDisplay() {
  const dashboardToggle = document.getElementById('dashboard-toggle');
  if (!dashboardToggle) return;
  const activeUser = getActiveUser();
  if (activeUser) {
    const firstName = String(activeUser.name || activeUser.email || '👤').split(' ')[0];
    dashboardToggle.textContent = firstName;
  } else {
    dashboardToggle.textContent = '👤';
  }
}

function renderAccountOrders() {
  const ordersContainer = document.getElementById('account-orders');
  const userLine = document.getElementById('account-user-line');
  const loginLink = document.querySelector('.account-login-link');
  const logoutBtn = document.getElementById('account-logout-btn');
  if (!ordersContainer || !userLine) return;

  const user = getActiveUser();
  if (!user) {
    userLine.textContent = 'Non connecte';
    ordersContainer.innerHTML = '<p>Connectez-vous pour voir votre historique.</p>';
    if (loginLink) loginLink.style.display = '';
    if (logoutBtn) logoutBtn.style.display = 'none';
    return;
  }

  userLine.textContent = `${user.name || user.email} (${user.email || user.provider})`;
  if (loginLink) loginLink.style.display = 'none';
  if (logoutBtn) logoutBtn.style.display = '';

  const orders = window.AgentAuth && typeof window.AgentAuth.getOrderHistory === 'function'
    ? window.AgentAuth.getOrderHistory()
    : [];

  if (!orders.length) {
    ordersContainer.innerHTML = '<p>Aucune commande enregistree pour le moment.</p>';
    return;
  }

  ordersContainer.innerHTML = orders.map(order => {
    const created = new Date(order.createdAt).toLocaleString('fr-FR');
    const items = Array.isArray(order.items) ? order.items : [];
    const line = items.map(it => `${it.name} x${it.quantity}`).join(', ');
    const status = order.status || 'en_attente';
    const statusLabel = status === 'livree' ? 'Livree' : status === 'payee' ? 'Payee' : 'En attente';
    return `
      <div class="account-order-item">
        <strong>${(order.totalAmount || 0).toLocaleString('fr-FR')} FCFA</strong>
        <div>${line || 'Produit premium'}</div>
        <div>${order.paymentMethod || 'Wave'} • ${created}</div>
        <span class="order-status ${status}">${statusLabel}</span>
      </div>
    `;
  }).join('');
}

function toggleAccountPanel() {
  const panel = document.getElementById('account-panel');
  if (!panel) return;
  renderAccountOrders();
  panel.classList.toggle('show');
}

function closeAccountPanel() {
  const panel = document.getElementById('account-panel');
  if (panel) panel.classList.remove('show');
}

function logoutUserFromSite() {
  if (window.AgentAuth && typeof window.AgentAuth.logout === 'function') {
    window.AgentAuth.logout();
  }
  currentUser = null;
  closeAccountPanel();
  updateUserDisplay();
}

function renderAdminOrders() {
  const list = document.getElementById('admin-orders-list');
  const panel = document.getElementById('admin-panel');
  if (!list || !panel) return;
  const user = getActiveUser();
  const isAdmin = !!(user && user.email && /admin/i.test(user.email));
  panel.style.display = isAdmin ? '' : 'none';
  if (!isAdmin) return;

  if (!window.AgentAuth || typeof window.AgentAuth.getAllOrdersForAdmin !== 'function') {
    list.innerHTML = '<p>Module admin indisponible.</p>';
    return;
  }
  const orders = window.AgentAuth.getAllOrdersForAdmin();
  const search = (document.getElementById('admin-order-search')?.value || '').toLowerCase();
  const filter = document.getElementById('admin-order-filter')?.value || '';
  const filtered = orders.filter((order) => {
    const hay = `${order.id} ${order.userName} ${order.userEmail}`.toLowerCase();
    const matchSearch = !search || hay.includes(search);
    const matchFilter = !filter || order.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = document.getElementById('admin-order-stats');
  if (stats) {
    const pending = orders.filter(o => o.status === 'en_attente').length;
    const paid = orders.filter(o => o.status === 'payee').length;
    const delivered = orders.filter(o => o.status === 'livree').length;
    const revenue = orders
      .filter(o => o.status === 'payee' || o.status === 'livree')
      .reduce((sum, o) => sum + (parseInt(o.totalAmount, 10) || 0), 0);
    const todayISO = new Date().toISOString().slice(0, 10);
    const todayCount = orders.filter(o => String(o.createdAt || "").slice(0, 10) === todayISO).length;
    stats.innerHTML = `
      <span>En attente: ${pending}</span>
      <span>Payees: ${paid}</span>
      <span>Livrees: ${delivered}</span>
      <span>CA encaisse: ${revenue.toLocaleString('fr-FR')} FCFA</span>
      <span>Cmd aujourd'hui: ${todayCount}</span>
      <span>Ajouts panier: ${conversionFunnel.add_to_cart || 0}</span>
      <span>Checkouts: ${conversionFunnel.start_checkout || 0}</span>
      <span>Paiements ouverts: ${conversionFunnel.payment_opened || 0}</span>
      <span>Cmd confirmees: ${conversionFunnel.order_confirmed || 0}</span>
      <button type="button" id="admin-export-csv-btn">Exporter CSV</button>
    `;
    const csvBtn = document.getElementById('admin-export-csv-btn');
    if (csvBtn) {
      csvBtn.addEventListener('click', exportAdminOrdersCsv);
    }
  }
  if (!filtered.length) {
    list.innerHTML = '<p>Aucune commande.</p>';
    return;
  }

  list.innerHTML = filtered.map(order => `
    <div class="admin-order-item" data-order-id="${order.id}" data-owner-id="${order.ownerId || ''}">
      <strong>${order.userName || order.userEmail}</strong><br>
      <span>${(order.totalAmount || 0).toLocaleString('fr-FR')} FCFA • ${new Date(order.createdAt).toLocaleString('fr-FR')}</span><br>
      <span>ID: ${order.id}</span>
      <select>
        <option value="en_attente" ${order.status === 'en_attente' ? 'selected' : ''}>En attente</option>
        <option value="payee" ${order.status === 'payee' ? 'selected' : ''}>Payee</option>
        <option value="livree" ${order.status === 'livree' ? 'selected' : ''}>Livree</option>
      </select>
    </div>
  `).join('');
}

function updateAdminOrderStatus(orderId, status, ownerId) {
  if (!window.AgentAuth || typeof window.AgentAuth.updateOrderStatus !== 'function') return;
  const result = window.AgentAuth.updateOrderStatus(orderId, status, ownerId);
  if (!result.ok) {
    renderAdminOrders();
    return;
  }
  if (window.NotificationService && typeof window.NotificationService.notifyOrder === "function") {
    window.NotificationService.notifyOrder("order_status_updated", {
      orderId,
      status,
      ownerId: ownerId || "",
      updatedAt: new Date().toISOString()
    }).catch(() => {});
  }
  renderAccountOrders();
  renderAdminOrders();
}

function exportAdminOrdersCsv() {
  if (!window.AgentAuth || typeof window.AgentAuth.getAllOrdersForAdmin !== "function") return;
  const rows = window.AgentAuth.getAllOrdersForAdmin();
  if (!Array.isArray(rows) || !rows.length) return;
  const header = ["id", "client", "email", "montant", "paiement", "statut", "date"];
  const lines = [header.join(",")];
  rows.forEach((row) => {
    lines.push([
      row.id || "",
      `"${String(row.userName || "").replace(/"/g, '""')}"`,
      `"${String(row.userEmail || "").replace(/"/g, '""')}"`,
      parseInt(row.totalAmount, 10) || 0,
      `"${String(row.paymentMethod || "").replace(/"/g, '""')}"`,
      row.status || "",
      row.createdAt || ""
    ].join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `commandes-agent-premium-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function getBackupPayload() {
  const keys = [
    "ap_users_v2",
    "ap_current_user_v2",
    "ap_backend_users_mirror",
    "ap_backend_orders_mirror",
    "ap_backend_favorites_mirror",
    "cart",
    CONVERSION_KEY
  ];
  const data = {};
  keys.forEach((k) => {
    data[k] = localStorage.getItem(k);
  });
  return {
    createdAt: new Date().toISOString(),
    site: "agent-premium",
    data
  };
}

function exportLocalBackup() {
  const payload = getBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup-agent-premium-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function syncCloudBackup() {
  const cfg = window.APP_CONFIG || {};
  const apiBase = String(cfg.apiBaseUrl || "").trim();
  if (!apiBase) {
    alert("apiBaseUrl non configure dans backend-config.js");
    return;
  }
  const res = await fetch(`${apiBase.replace(/\/$/, "")}/api/backup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(getBackupPayload())
  }).catch(() => null);
  if (!res || !res.ok) {
    alert("Echec sauvegarde cloud.");
    return;
  }
  alert("Sauvegarde cloud envoyee.");
}

function applyAnnouncementFromStorage() {
  const node = document.getElementById("site-announcement");
  if (!node) return;
  const maintenance = localStorage.getItem("ap_maintenance_mode") === "1";
  const promoText = localStorage.getItem("ap_promo_banner") || "";
  if (maintenance) {
    node.textContent = "Maintenance en cours. Certaines fonctions peuvent etre ralenties.";
    node.classList.add("show");
    return;
  }
  if (promoText) {
    node.textContent = promoText;
    node.classList.add("show");
    return;
  }
  node.classList.remove("show");
  node.textContent = "";
}

function initAdminTools() {
  const maintenanceToggle = document.getElementById("maintenance-toggle");
  const promoInput = document.getElementById("promo-banner-text");
  const promoSave = document.getElementById("save-promo-banner");
  const backupExportBtn = document.getElementById("backup-export-btn");
  const backupCloudBtn = document.getElementById("backup-cloud-btn");

  if (maintenanceToggle) {
    maintenanceToggle.checked = localStorage.getItem("ap_maintenance_mode") === "1";
    maintenanceToggle.addEventListener("change", () => {
      localStorage.setItem("ap_maintenance_mode", maintenanceToggle.checked ? "1" : "0");
      applyAnnouncementFromStorage();
    });
  }
  if (promoInput) {
    promoInput.value = localStorage.getItem("ap_promo_banner") || "";
  }
  if (promoSave) {
    promoSave.addEventListener("click", () => {
      const text = (promoInput?.value || "").trim();
      localStorage.setItem("ap_promo_banner", text);
      applyAnnouncementFromStorage();
    });
  }
  if (backupExportBtn) {
    backupExportBtn.addEventListener("click", exportLocalBackup);
  }
  if (backupCloudBtn) {
    backupCloudBtn.addEventListener("click", () => {
      syncCloudBackup().catch(() => alert("Erreur sauvegarde cloud."));
    });
  }
}

function migrateLegacyInlineHandlers() {
  document.querySelectorAll("[onclick]").forEach((el) => {
    const action = (el.getAttribute("onclick") || "").trim();
    if (!action) return;
    el.removeAttribute("onclick");

    if (action.includes("orderProduct(")) {
      const match = action.match(/orderProduct\('([^']+)'/);
      if (match) el.addEventListener("click", () => orderProduct(match[1]));
      return;
    }
    if (action.includes("payWithWave(")) {
      const match = action.match(/payWithWave\('([^']+)'[, ]+([0-9]+)/);
      if (match) el.addEventListener("click", () => payWithWave(match[1], parseInt(match[2], 10) || 0));
      return;
    }
    if (action.includes("shareOnFacebook")) return el.addEventListener("click", (e) => { e.preventDefault(); shareOnFacebook(); });
    if (action.includes("shareOnTwitter")) return el.addEventListener("click", (e) => { e.preventDefault(); shareOnTwitter(); });
    if (action.includes("shareOnWhatsApp")) return el.addEventListener("click", (e) => { e.preventDefault(); shareOnWhatsApp(); });
    if (action.includes("toggleCart")) return el.addEventListener("click", toggleCart);
    if (action.includes("checkout()")) return el.addEventListener("click", checkout);
    if (action.includes("continueShopping()")) return el.addEventListener("click", continueShopping);
    if (action.includes("toggleChat()")) return el.addEventListener("click", toggleChat);
    if (action.includes("closeChat()")) return el.addEventListener("click", closeChat);
    if (action.includes("sendChatMessage()")) return el.addEventListener("click", sendChatMessage);
    if (action.includes("closeAccountPanel()")) return el.addEventListener("click", closeAccountPanel);
    if (action.includes("logoutUserFromSite()")) return el.addEventListener("click", logoutUserFromSite);
    if (action.includes("acceptCookies()")) return el.addEventListener("click", acceptCookies);
    if (action.includes("rejectCookies()")) return el.addEventListener("click", rejectCookies);
    if (action.includes("closeQuickCheckout()")) return el.addEventListener("click", closeQuickCheckout);
    if (action.includes("handleQuickChatTopic(")) {
      const topic = action.match(/handleQuickChatTopic\('([^']+)'\)/)?.[1];
      if (topic) el.addEventListener("click", () => handleQuickChatTopic(topic));
      return;
    }
    if (action.includes("document.getElementById('products').scrollIntoView")) {
      return el.addEventListener("click", () => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }));
    }
  });

  const chatInput = document.getElementById("chat-input");
  if (chatInput) {
    chatInput.removeAttribute("onkeypress");
    chatInput.addEventListener("keypress", handleChatKeyPress);
  }
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.removeAttribute("oninput");
    searchInput.addEventListener("input", filterProducts);
  }
  const categoryFilter = document.getElementById("category-filter");
  if (categoryFilter) {
    categoryFilter.removeAttribute("onchange");
    categoryFilter.addEventListener("change", filterProducts);
  }
  const sortSelect = document.getElementById("sort-products");
  if (sortSelect) {
    sortSelect.removeAttribute("onchange");
    sortSelect.addEventListener("change", sortProducts);
  }
  const adminSearch = document.getElementById("admin-order-search");
  if (adminSearch) {
    adminSearch.removeAttribute("oninput");
    adminSearch.addEventListener("input", renderAdminOrders);
  }
  const adminFilter = document.getElementById("admin-order-filter");
  if (adminFilter) {
    adminFilter.removeAttribute("onchange");
    adminFilter.addEventListener("change", renderAdminOrders);
  }
}

/* ================= PAYMENT INTEGRATION ================= */
function showPaymentModal() {
  const modal = document.getElementById('payment-modal') || createPaymentModal();
  modal.classList.add('show');
}

function createPaymentModal() {
  const modal = document.createElement('div');
  modal.id = 'payment-modal';
  modal.className = 'payment-modal';
  modal.innerHTML = `
    <div class="payment-form">
      <h3>Choisir un mode de paiement</h3>
      <div class="payment-methods">
        <div class="payment-method" data-type="wave" onclick="selectPaymentMethod('wave')">
          <img src="images/wave-logo.png" alt="Wave" style="width: 50px; height: 50px;">
          <span>Wave</span>
        </div>
        <div class="payment-method" data-type="orange" onclick="selectPaymentMethod('orange')">
          <img src="images/orange-logo.png" alt="Orange Money" style="width: 50px; height: 50px;">
          <span>Orange Money</span>
        </div>
        <div class="payment-method" data-type="mtn" onclick="selectPaymentMethod('mtn')">
          <img src="images/mtn-logo.png" alt="MTN" style="width: 50px; height: 50px;">
          <span>MTN MoMo</span>
        </div>
      </div>
      <button onclick="processPayment()">Payer maintenant</button>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function selectPaymentMethod(type) {
  document.querySelectorAll('.payment-method').forEach(method => {
    method.classList.remove('selected');
  });
  const selected = document.querySelector(`.payment-method[data-type="${type}"]`);
  if (selected) {
    selected.classList.add('selected');
  }
}

function processPayment() {
  const selectedMethod = document.querySelector('.payment-method.selected');
  if (!selectedMethod) {
    alert('Veuillez sélectionner un mode de paiement.');
    return;
  }

  const method = selectedMethod.dataset.type;
  // Simulate payment processing
  alert(`Paiement en cours via ${method}...`);
  setTimeout(() => {
    alert('Paiement réussi ! Vous recevrez vos comptes par WhatsApp.');
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
    document.getElementById('payment-modal').classList.remove('show');
  }, 2000);
}

/* ================= PUSH NOTIFICATIONS ================= */
function sendPromoNotification() {
  if (isPromoActive()) {
    sendPushNotification('Promotion active !', 'Profitez de -12% sur tous les comptes premium !');
  }
}

// Send promo notification every hour during promo
setInterval(sendPromoNotification, 3600000);

/* ================= TESTIMONIALS SLIDER ================= */
function initializeTestimonialsSlider() {
  const container = document.querySelector('.testimonials-container');
  const slides = document.querySelectorAll('.testimonial-slide');
  const dots = document.querySelectorAll('.slider-dot');
  if (!container || slides.length === 0 || dots.length === 0) return;
  let currentIndex = 0;

  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
    container.style.transform = `translateX(-${index * 100}%)`;
  }

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      currentIndex = index;
      showSlide(currentIndex);
    });
  });

  // Auto-slide every 5 seconds
  setInterval(() => {
    currentIndex = (currentIndex + 1) % slides.length;
    showSlide(currentIndex);
  }, 5000);
}

/* ================= NEWSLETTER ================= */
document.addEventListener('DOMContentLoaded', () => {
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = newsletterForm.querySelector('input').value;
      if (email) {
        // Simulation d'inscription
        alert('Merci pour votre inscription ! Vous recevrez bientôt nos offres.');
        newsletterForm.reset();
      }
    });
  }
});

/* ================= SOCIAL SHARE ================= */
function shareOnFacebook() {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent("Découvrez AGENT PREMIUM - Comptes premium à prix réduit !");
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
}

function shareOnTwitter() {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent("Découvrez AGENT PREMIUM - Comptes premium à prix réduit ! #AGENTPREMIUM");
  window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
}

function shareOnWhatsApp() {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent("Découvrez AGENT PREMIUM - Comptes premium à prix réduit !");
  window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
}

/* ================= COOKIE BANNER ================= */
function initializeCookieBanner() {
  const banner = document.getElementById('cookie-banner');
  if (banner && !localStorage.getItem('cookiesAccepted')) {
    setTimeout(() => banner.classList.add('show'), 2000);
  }
}

function acceptCookies() {
  localStorage.setItem('cookiesAccepted', 'true');
  document.getElementById('cookie-banner').classList.remove('show');
}

function rejectCookies() {
  localStorage.setItem('cookiesAccepted', 'false');
  document.getElementById('cookie-banner').classList.remove('show');
}

/* ================= OFFER ENHANCEMENTS ================= */
function normalizeProductPrices() {
  const readAmount = (value) => {
    const match = String(value || '').match(/\d[\d\s]*/);
    if (!match) return 0;
    return parseInt(match[0].replace(/\s/g, ''), 10) || 0;
  };

  document.querySelectorAll('.product-card').forEach(card => {
    const priceEl = card.querySelector('.price');
    if (!priceEl) return;

    const oldEl = priceEl.querySelector('.price-old');
    const newEl = priceEl.querySelector('.price-new');

    if (oldEl && newEl) {
      const oldAmount = readAmount(oldEl.textContent);
      const newAmount = readAmount(newEl.textContent);
      const suffix = /mois/i.test(priceEl.textContent || '') ? ' / mois' : '';
      if (oldAmount) oldEl.textContent = `${oldAmount.toLocaleString('fr-FR')} FCFA${suffix}`;
      if (newAmount) newEl.textContent = `${newAmount.toLocaleString('fr-FR')} FCFA${suffix}`;
      if (newAmount) card.dataset.price = String(newAmount);
      return;
    }

    const text = priceEl.textContent || '';
    const amount = readAmount(text);
    if (!amount) return;
    const suffix = /mois/i.test(text) ? ' / mois' : '';
    priceEl.textContent = `${amount.toLocaleString('fr-FR')} FCFA${suffix}`;
    card.dataset.price = String(amount);
  });
}

function injectProductDetails() {
  const catalogInfo = {
    'Netflix Premium': { duration: '1 mois', type: 'Partage', warranty: '7 jours' },
    'Spotify Premium': { duration: '1 mois', type: 'Prive', warranty: '7 jours' },
    'Canva Pro': { duration: '1 mois', type: 'Prive', warranty: '7 jours' },
    'Disney+': { duration: '1 mois', type: 'Partage', warranty: '7 jours' },
    'Adobe Pro 3 mois': { duration: '3 mois', type: 'Prive', warranty: '7 jours' },
    'Figma': { duration: '1 mois', type: 'Prive', warranty: '7 jours' },
    'YouTube Premium': { duration: '1 mois', type: 'Prive', warranty: '7 jours' },
    'Amazon Prime Video': { duration: '1 mois', type: 'Partage', warranty: '7 jours' },
    'ChatGPT Plus': { duration: '1 mois', type: 'Prive', warranty: '7 jours' },
    'Microsoft 365': { duration: '1 mois', type: 'Prive', warranty: '7 jours' },
    'Crunchyroll Premium': { duration: '1 mois', type: 'Partage', warranty: '7 jours' },
    'Deezer Premium': { duration: '1 mois', type: 'Prive', warranty: '7 jours' },
    'Capcut Pro': { duration: '1 mois', type: 'Prive', warranty: '7 jours' }
  };

  document.querySelectorAll('.product-card').forEach((card, index) => {
    if (card.querySelector('.product-meta')) return;
    const title = card.querySelector('h3')?.textContent?.trim() || '';
    const info = catalogInfo[title] || { duration: '1 mois', type: 'Prive', warranty: '7 jours' };
    const meta = document.createElement('div');
    meta.className = 'product-meta';
    meta.innerHTML = `
      <span>Duree: ${info.duration}</span>
      <span>Type: ${info.type}</span>
      <span>Garantie: ${info.warranty}</span>
      <span>Livraison: &lt; 5 min</span>
    `;
    const priceEl = card.querySelector('.price');
    if (priceEl) {
      priceEl.insertAdjacentElement('afterend', meta);
    } else {
      card.appendChild(meta);
    }

    if (index < 3 && !card.querySelector('.product-ribbon')) {
      const ribbon = document.createElement('span');
      ribbon.className = 'product-ribbon';
      ribbon.textContent = 'Top vente';
      card.appendChild(ribbon);
    }
  });
}

function animateCounters() {
  document.querySelectorAll('[data-target]').forEach(counter => {
    const target = parseInt(counter.dataset.target || '0', 10);
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 80));
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      if (counter.id === 'rating-count') {
        counter.textContent = (current / 10).toFixed(1);
      } else {
        counter.textContent = current.toLocaleString('fr-FR');
      }
    }, 18);
  });
}

function hasVerifiedPurchase() {
  if (!window.AgentAuth || typeof window.AgentAuth.getOrderHistory !== 'function') return false;
  const orders = window.AgentAuth.getOrderHistory();
  return Array.isArray(orders) && orders.length > 0;
}

function renderVerifiedReviews() {
  const wrap = document.getElementById('verified-reviews-list');
  if (!wrap) return;
  let reviews = [];
  try {
    reviews = JSON.parse(localStorage.getItem('ap_verified_reviews_v1')) || [];
  } catch {
    reviews = [];
  }
  if (!reviews.length) {
    wrap.innerHTML = '<p class="verified-review-empty">Aucun nouvel avis verifie pour le moment.</p>';
    return;
  }
  wrap.innerHTML = reviews.slice(0, 6).map((r) => `
    <article class="verified-review-item">
      <div><strong>${r.name}</strong> <span class="verified-badge">Achat verifie</span></div>
      <p>${r.comment}</p>
      <small>${new Date(r.createdAt).toLocaleDateString('fr-FR')}</small>
    </article>
  `).join('');
}

function initVerifiedReviewComposer() {
  const section = document.querySelector('.reviews');
  if (!section || document.getElementById('verified-review-block')) return;
  const block = document.createElement('div');
  block.id = 'verified-review-block';
  block.className = 'verified-review-block';
  block.innerHTML = `
    <h3>Avis verifies recents</h3>
    <div id="verified-reviews-list"></div>
    <form id="verified-review-form" class="verified-review-form">
      <textarea id="verified-review-text" rows="3" maxlength="280" placeholder="Partagez votre experience apres votre achat..." required></textarea>
      <button type="submit">Publier mon avis verifie</button>
    </form>
    <p id="verified-review-msg" class="verified-review-msg"></p>
  `;
  section.appendChild(block);

  const form = document.getElementById('verified-review-form');
  const msg = document.getElementById('verified-review-msg');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = getActiveUser();
      if (!user) {
        msg.textContent = 'Connectez-vous pour laisser un avis verifie.';
        msg.style.color = '#9a2d2d';
        return;
      }
      if (!hasVerifiedPurchase()) {
        msg.textContent = 'Avis reserve aux clients ayant deja commande.';
        msg.style.color = '#9a2d2d';
        return;
      }
      const text = document.getElementById('verified-review-text')?.value.trim();
      if (!text || text.length < 8) {
        msg.textContent = 'Votre avis doit contenir au moins 8 caracteres.';
        msg.style.color = '#9a2d2d';
        return;
      }
      let current = [];
      try {
        current = JSON.parse(localStorage.getItem('ap_verified_reviews_v1')) || [];
      } catch {
        current = [];
      }
      current.unshift({
        id: `rv_${Date.now()}`,
        userId: user.id || "",
        name: user.name || user.email || "Client",
        comment: text,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('ap_verified_reviews_v1', JSON.stringify(current.slice(0, 30)));
      form.reset();
      msg.textContent = 'Avis publie avec succes.';
      msg.style.color = '#0b7f66';
      renderVerifiedReviews();
    });
  }
  renderVerifiedReviews();
}

function applyPerformanceEnhancements() {
  document.querySelectorAll('img').forEach((img) => {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  trackFunnel('page_views');
  migrateLegacyInlineHandlers();
  normalizeProductCopy();
  normalizeProductPrices();
  injectProductDetails();
  animateCounters();
  applyPerformanceEnhancements();
  initVerifiedReviewComposer();
  initializeUrgencyMode();
  applyAnnouncementFromStorage();
  initAdminTools();
  updateProductButtonLabels();
  updateUserDisplay();
  renderAccountOrders();
  renderAdminOrders();

  document.addEventListener('click', (e) => {
    const suggest = e.target.closest('[data-suggest]');
    if (suggest) {
      const name = suggest.getAttribute('data-suggest');
      const price = getPriceFromCard(name);
      if (name && price) addToCart(name, price);
      return;
    }
    const statusSelect = e.target.closest('.admin-order-item select');
    if (statusSelect) return;
  });

  document.addEventListener('change', (e) => {
    const statusSelect = e.target.closest('.admin-order-item select');
    if (!statusSelect) return;
    const item = statusSelect.closest('.admin-order-item');
    const orderId = item?.getAttribute('data-order-id');
    const ownerId = item?.getAttribute('data-owner-id') || '';
    if (orderId) updateAdminOrderStatus(orderId, statusSelect.value, ownerId);
  });

  const dashboardToggle = document.getElementById('dashboard-toggle');
  const accountPanel = document.getElementById('account-panel');
  if (dashboardToggle) {
    dashboardToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const user = getActiveUser();
      if (!user) {
        window.location.href = 'login.html?redirect=index.html';
        return;
      }
      toggleAccountPanel();
    });
  }
  document.addEventListener('click', (e) => {
    if (!accountPanel || !accountPanel.classList.contains('show')) return;
    if (accountPanel.contains(e.target)) return;
    if (dashboardToggle && dashboardToggle.contains(e.target)) return;
    closeAccountPanel();
  });

  const quickModal = document.getElementById('quick-checkout-modal');
  if (quickModal) {
    quickModal.addEventListener('click', (e) => {
      if (e.target === quickModal) {
        closeQuickCheckout();
      }
    });
  }
});

/* ================= ADMIN PANEL ================= */
document.addEventListener('DOMContentLoaded', () => {
  const adminToggle = document.getElementById('admin-toggle');
  const adminPanel = document.getElementById('admin-panel');
  const adminForm = document.getElementById('admin-form');

  if (adminToggle && adminPanel) {
    adminToggle.addEventListener('click', () => {
      adminPanel.classList.toggle('show');
    });

    // Fermer en cliquant à l'extérieur
    document.addEventListener('click', (e) => {
      if (!adminPanel.contains(e.target) && !adminToggle.contains(e.target)) {
        adminPanel.classList.remove('show');
      }
    });
  }

  if (adminForm) {
    adminForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = adminForm.querySelector('input[type="text"]').value;
      const price = adminForm.querySelector('input[type="number"]').value;
      const desc = adminForm.querySelector('textarea').value;

      if (name && price) {
        // Simulation d'ajout de produit
        alert(`Produit "${name}" ajouté avec succès !`);
        adminForm.reset();
        if (adminPanel) adminPanel.classList.remove('show');
      }
    });
  }
});
