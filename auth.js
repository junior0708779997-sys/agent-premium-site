/* Client-side auth + orders/favorites persistence.
   For production, migrate to a secure backend. */
(function () {
  const USERS_KEY = "ap_users_v2";
  const CURRENT_USER_KEY = "ap_current_user_v2";
  const ORDERS_PREFIX = "ap_orders_v2_";
  const FAVORITES_PREFIX = "ap_favorites_v2_";

  function loadUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function safeIdFromEmail(email) {
    return normalizeEmail(email).replace(/[^a-z0-9]/g, "_");
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
  }

  function isStrongEnoughPassword(password) {
    const value = String(password || "");
    return value.length >= 8;
  }

  async function sha256Hex(input) {
    const data = new TextEncoder().encode(String(input || ""));
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function setCurrentUser(user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
    } catch {
      return null;
    }
  }

  function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  async function registerEmail(name, email, password) {
    const cleanEmail = normalizeEmail(email);
    const cleanName = String(name || "").trim();
    if (!cleanName || !cleanEmail || !password) {
      return { ok: false, message: "Tous les champs sont requis." };
    }
    if (!isValidEmail(cleanEmail)) {
      return { ok: false, message: "Email invalide." };
    }
    if (!isStrongEnoughPassword(password)) {
      return { ok: false, message: "Mot de passe trop court (8 caracteres min)." };
    }

    const users = loadUsers();
    if (users.find((u) => u.email === cleanEmail)) {
      return { ok: false, message: "Cet email existe deja." };
    }

    const user = {
      id: "email_" + safeIdFromEmail(cleanEmail),
      provider: "email",
      name: cleanName,
      email: cleanEmail,
      passwordHash: await sha256Hex(password),
      createdAt: new Date().toISOString()
    };
    users.push(user);
    saveUsers(users);
    if (window.AgentBackend && typeof window.AgentBackend.saveUser === "function") {
      window.AgentBackend.saveUser(user).catch(() => {});
    }

    const sessionUser = { id: user.id, provider: user.provider, name: user.name, email: user.email };
    setCurrentUser(sessionUser);
    return { ok: true, user: sessionUser };
  }

  async function loginEmail(email, password) {
    const cleanEmail = normalizeEmail(email);
    if (!isValidEmail(cleanEmail)) {
      return { ok: false, message: "Email invalide." };
    }
    if (!password) {
      return { ok: false, message: "Mot de passe requis." };
    }
    const passwordHash = await sha256Hex(password);
    const users = loadUsers();
    const user = users.find((u) => u.email === cleanEmail && u.passwordHash === passwordHash);
    if (!user) {
      return { ok: false, message: "Email ou mot de passe invalide." };
    }
    const sessionUser = { id: user.id, provider: user.provider, name: user.name, email: user.email };
    setCurrentUser(sessionUser);
    return { ok: true, user: sessionUser };
  }

  async function resetPasswordEmail(email, newPassword) {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !newPassword) {
      return { ok: false, message: "Email et nouveau mot de passe requis." };
    }
    if (!isValidEmail(cleanEmail)) {
      return { ok: false, message: "Email invalide." };
    }
    if (!isStrongEnoughPassword(newPassword)) {
      return { ok: false, message: "Mot de passe trop court (8 caracteres min)." };
    }
    const users = loadUsers();
    const idx = users.findIndex((u) => u.email === cleanEmail);
    if (idx < 0) {
      return { ok: false, message: "Compte introuvable." };
    }
    users[idx].passwordHash = await sha256Hex(newPassword);
    users[idx].updatedAt = new Date().toISOString();
    saveUsers(users);
    if (window.AgentBackend && typeof window.AgentBackend.saveUser === "function") {
      window.AgentBackend.saveUser(users[idx]).catch(() => {});
    }
    return { ok: true };
  }

  function decodeJwtPayload(jwt) {
    try {
      const payload = jwt.split(".")[1];
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      return JSON.parse(decodeURIComponent(escape(atob(padded))));
    } catch {
      return null;
    }
  }

  function loginWithGoogleCredential(credential) {
    const payload = decodeJwtPayload(credential);
    if (!payload || !payload.email) {
      return { ok: false, message: "Connexion Google invalide." };
    }
    const sessionUser = {
      id: "google_" + safeIdFromEmail(payload.email),
      provider: "google",
      name: payload.name || payload.given_name || payload.email.split("@")[0],
      email: normalizeEmail(payload.email),
      picture: payload.picture || ""
    };
    setCurrentUser(sessionUser);
    return { ok: true, user: sessionUser };
  }

  function initGoogleButton(containerId, onSuccess, onError) {
    const clientId = window.GOOGLE_CLIENT_ID || "";
    const container = document.getElementById(containerId);
    if (!container) return false;

    if (!clientId || !window.google || !google.accounts || !google.accounts.id) {
      container.style.display = "none";
      return false;
    }

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        const result = loginWithGoogleCredential(response.credential);
        if (result.ok) {
          if (typeof onSuccess === "function") onSuccess(result.user);
        } else if (typeof onError === "function") {
          onError(result.message);
        }
      }
    });
    google.accounts.id.renderButton(container, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      width: 290
    });
    return true;
  }

  function orderKeyForUser(userId) {
    return ORDERS_PREFIX + userId;
  }

  function getOrderHistory() {
    const user = getCurrentUser();
    if (!user || !user.id) return [];
    const key = orderKeyForUser(user.id);
    try {
      const local = JSON.parse(localStorage.getItem(key)) || [];
      if (window.AgentBackend && typeof window.AgentBackend.getOrdersByUser === "function") {
        window.AgentBackend.getOrdersByUser(user.id).then((remote) => {
          if (Array.isArray(remote)) {
            localStorage.setItem(key, JSON.stringify(remote));
          }
        }).catch(() => {});
      }
      return local;
    } catch {
      return [];
    }
  }

  function recordOrder(order) {
    const user = getCurrentUser();
    if (!user || !user.id) return { ok: false, message: "Utilisateur non connecte." };

    const orders = getOrderHistory();
    const entry = {
      id: "cmd_" + Date.now(),
      createdAt: new Date().toISOString(),
      status: "en_attente",
      ...order
    };
    orders.unshift(entry);
    localStorage.setItem(orderKeyForUser(user.id), JSON.stringify(orders));
    if (window.AgentBackend && typeof window.AgentBackend.saveOrder === "function") {
      window.AgentBackend.saveOrder(user.id, entry).catch(() => {});
    }
    return { ok: true, order: entry };
  }

  function updateOrderStatus(orderId, nextStatus, ownerId) {
    const user = getCurrentUser();
    if (!user || !user.id) return { ok: false, message: "Utilisateur non connecte." };

    if (ownerId) {
      try {
        const list = JSON.parse(localStorage.getItem(orderKeyForUser(ownerId))) || [];
        const idx = list.findIndex((o) => o.id === orderId);
        if (idx < 0) return { ok: false, message: "Commande introuvable." };
        list[idx].status = nextStatus;
        list[idx].updatedAt = new Date().toISOString();
        localStorage.setItem(orderKeyForUser(ownerId), JSON.stringify(list));
        if (window.AgentBackend && typeof window.AgentBackend.updateOrder === "function") {
          window.AgentBackend.updateOrder(ownerId, orderId, nextStatus).catch(() => {});
        }
        return { ok: true, order: list[idx] };
      } catch {
        return { ok: false, message: "Mise a jour impossible." };
      }
    }

    const orders = getOrderHistory();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx < 0) return { ok: false, message: "Commande introuvable." };
    orders[idx].status = nextStatus;
    orders[idx].updatedAt = new Date().toISOString();
    localStorage.setItem(orderKeyForUser(user.id), JSON.stringify(orders));
    if (window.AgentBackend && typeof window.AgentBackend.updateOrder === "function") {
      window.AgentBackend.updateOrder(user.id, orderId, nextStatus).catch(() => {});
    }
    return { ok: true, order: orders[idx] };
  }

  function getAllOrdersForAdmin() {
    const user = getCurrentUser();
    if (!user || !user.email || !/admin/i.test(user.email)) return [];

    if (window.AgentBackend && typeof window.AgentBackend.getAllOrdersForAdmin === "function") {
      const backendOrders = window.AgentBackend.getAllOrdersForAdmin();
      if (Array.isArray(backendOrders) && backendOrders.length) return backendOrders;
    }

    const users = loadUsers();
    const all = [];
    users.forEach((u) => {
      try {
        const list = JSON.parse(localStorage.getItem(orderKeyForUser(u.id))) || [];
        list.forEach((o) => all.push({ ...o, ownerId: u.id, userEmail: u.email, userName: u.name || u.email }));
      } catch {}
    });
    return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function favoritesKeyForUser(userId) {
    return FAVORITES_PREFIX + userId;
  }

  function getFavorites() {
    const user = getCurrentUser();
    if (!user || !user.id) return [];
    const key = favoritesKeyForUser(user.id);
    try {
      const local = JSON.parse(localStorage.getItem(key)) || [];
      if (window.AgentBackend && typeof window.AgentBackend.getFavorites === "function") {
        const remote = window.AgentBackend.getFavorites(user.id);
        if (Array.isArray(remote) && remote.length !== local.length) {
          localStorage.setItem(key, JSON.stringify(remote));
          return remote;
        }
      }
      return local;
    } catch {
      return [];
    }
  }

  function toggleFavorite(productName) {
    const user = getCurrentUser();
    if (!user || !user.id) return { ok: false, message: "Utilisateur non connecte." };
    const favorites = getFavorites();
    const index = favorites.indexOf(productName);
    if (index >= 0) favorites.splice(index, 1);
    else favorites.push(productName);
    localStorage.setItem(favoritesKeyForUser(user.id), JSON.stringify(favorites));
    if (window.AgentBackend && typeof window.AgentBackend.saveFavorites === "function") {
      window.AgentBackend.saveFavorites(user.id, favorites).catch(() => {});
    }
    return { ok: true, favorites };
  }

  window.AgentAuth = {
    getCurrentUser,
    loginEmail,
    resetPasswordEmail,
    registerEmail,
    logout,
    initGoogleButton,
    getOrderHistory,
    recordOrder,
    updateOrderStatus,
    getAllOrdersForAdmin,
    getFavorites,
    toggleFavorite
  };
})();
