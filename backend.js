(function () {
  const cfg = window.APP_CONFIG || {};
  const hasSupabase = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase && window.supabase.createClient);
  const client = hasSupabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

  function safeParse(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
      return fallback;
    }
  }

  function safeSet(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function mirrorUsers(users) {
    safeSet("ap_backend_users_mirror", users);
  }

  function mirrorOrdersByUser(map) {
    safeSet("ap_backend_orders_mirror", map);
  }

  function mirrorFavoritesByUser(map) {
    safeSet("ap_backend_favorites_mirror", map);
  }

  function getUsersMirror() {
    return safeParse("ap_backend_users_mirror", []);
  }

  function getOrdersMirror() {
    return safeParse("ap_backend_orders_mirror", {});
  }

  function getFavoritesMirror() {
    return safeParse("ap_backend_favorites_mirror", {});
  }

  async function listUsers() {
    const users = getUsersMirror();
    if (!client) return users;
    try {
      const { data, error } = await client.from("users").select("*");
      if (error) return users;
      mirrorUsers(data || []);
      return data || [];
    } catch {
      return users;
    }
  }

  async function saveUser(user) {
    const users = getUsersMirror();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) users[idx] = user;
    else users.push(user);
    mirrorUsers(users);

    if (client) {
      try {
        await client.from("users").upsert(user);
      } catch {}
    }
    return { ok: true, user };
  }

  async function getOrdersByUser(userId) {
    const map = getOrdersMirror();
    const local = map[userId] || [];
    if (!client) return local;
    try {
      const { data, error } = await client.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) return local;
      map[userId] = data || [];
      mirrorOrdersByUser(map);
      return data || [];
    } catch {
      return local;
    }
  }

  async function saveOrder(userId, order) {
    const map = getOrdersMirror();
    const list = map[userId] || [];
    list.unshift(order);
    map[userId] = list;
    mirrorOrdersByUser(map);

    if (client) {
      try {
        const payload = { ...order, user_id: userId, created_at: order.createdAt };
        await client.from("orders").upsert(payload);
      } catch {}
    }
    return { ok: true, order };
  }

  async function updateOrder(userId, orderId, status) {
    const map = getOrdersMirror();
    const list = map[userId] || [];
    const idx = list.findIndex((o) => o.id === orderId);
    if (idx < 0) return { ok: false, message: "Commande introuvable." };
    list[idx].status = status;
    list[idx].updatedAt = new Date().toISOString();
    map[userId] = list;
    mirrorOrdersByUser(map);

    if (client) {
      try {
        await client.from("orders").update({ status, updated_at: list[idx].updatedAt }).eq("id", orderId).eq("user_id", userId);
      } catch {}
    }
    return { ok: true, order: list[idx] };
  }

  function getAllOrdersForAdmin() {
    const users = getUsersMirror();
    const orders = getOrdersMirror();
    const all = [];
    users.forEach((u) => {
      (orders[u.id] || []).forEach((o) => all.push({ ...o, ownerId: u.id, userEmail: u.email, userName: u.name || u.email }));
    });
    return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function findOrderById(orderId) {
    const users = getUsersMirror();
    const orders = getOrdersMirror();
    for (const u of users) {
      const found = (orders[u.id] || []).find((o) => o.id === orderId);
      if (found) {
        return { ...found, ownerId: u.id, userEmail: u.email, userName: u.name || u.email };
      }
    }
    return null;
  }

  function getFavorites(userId) {
    const map = getFavoritesMirror();
    return map[userId] || [];
  }

  async function saveFavorites(userId, favorites) {
    const map = getFavoritesMirror();
    map[userId] = favorites;
    mirrorFavoritesByUser(map);

    if (client) {
      try {
        await client.from("favorites").upsert({ user_id: userId, items: favorites });
      } catch {}
    }
    return { ok: true, favorites };
  }

  window.AgentBackend = {
    listUsers,
    saveUser,
    getOrdersByUser,
    saveOrder,
    updateOrder,
    getAllOrdersForAdmin,
    findOrderById,
    getFavorites,
    saveFavorites
  };
})();
