/* Simple client-side auth + order history persistence.
   For production, replace with secure backend auth/storage. */
(function () {
  const USERS_KEY = "ap_users_v1";
  const CURRENT_USER_KEY = "ap_current_user_v1";
  const ORDERS_PREFIX = "ap_orders_v1_";

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

  function encodePassword(password) {
    return btoa(unescape(encodeURIComponent(String(password || ""))));
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

  function registerEmail(name, email, password) {
    const cleanEmail = normalizeEmail(email);
    const cleanName = String(name || "").trim();
    if (!cleanName || !cleanEmail || !password) {
      return { ok: false, message: "Tous les champs sont requis." };
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
      password: encodePassword(password),
      createdAt: new Date().toISOString()
    };
    users.push(user);
    saveUsers(users);
    const sessionUser = { id: user.id, provider: user.provider, name: user.name, email: user.email };
    setCurrentUser(sessionUser);
    return { ok: true, user: sessionUser };
  }

  function loginEmail(email, password) {
    const cleanEmail = normalizeEmail(email);
    const users = loadUsers();
    const user = users.find((u) => u.email === cleanEmail && u.password === encodePassword(password));
    if (!user) {
      return { ok: false, message: "Email ou mot de passe invalide." };
    }
    const sessionUser = { id: user.id, provider: user.provider, name: user.name, email: user.email };
    setCurrentUser(sessionUser);
    return { ok: true, user: sessionUser };
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
    if (!container) return;

    if (!clientId) {
      container.innerHTML = '<p style="font-size:12px;color:#8a2f2f">Google non configure (ajoute GOOGLE_CLIENT_ID dans auth-config.js).</p>';
      return;
    }
    if (!window.google || !google.accounts || !google.accounts.id) {
      container.innerHTML = '<p style="font-size:12px;color:#8a2f2f">Librairie Google indisponible.</p>';
      return;
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
  }

  function orderKeyForUser(userId) {
    return ORDERS_PREFIX + userId;
  }

  function getOrderHistory() {
    const user = getCurrentUser();
    if (!user || !user.id) return [];
    try {
      return JSON.parse(localStorage.getItem(orderKeyForUser(user.id))) || [];
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
      ...order
    };
    orders.unshift(entry);
    localStorage.setItem(orderKeyForUser(user.id), JSON.stringify(orders));
    return { ok: true, order: entry };
  }

  window.AgentAuth = {
    getCurrentUser,
    loginEmail,
    registerEmail,
    logout,
    initGoogleButton,
    getOrderHistory,
    recordOrder
  };
})();
