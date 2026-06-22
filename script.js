const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwl-EtuwHC_UIzo2qKTB9MZNxo7bqynx2zfPWFDFyESXa2W0R84taOAgtyZYG3s07H2xw/exec";

const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

if (tg) {
  tg.ready();
  tg.expand();
}

const PRODUCTS = [
  {
    id: 1,
    name: "Дайс-трей из дерева",
    price: 1900,
    description: "Ручная работа для хранения кубиков и красивой игры."
  },
  {
    id: 2,
    name: "Деревянный сундук",
    price: 3500,
    description: "Сувенирный сундук для аксессуаров, подарков и мелочей."
  }
];

const state = {
  cart: [],
  currentPage: "catalog"
};

function showToast(text) {
  const toast = document.getElementById("toast");
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function formatPrice(value) {
  return `${Number(value).toLocaleString("ru-RU")} ₽`;
}

function getUserData() {
  const user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null;

  if (!user) {
    return {
      user_id: "",
      username: "",
      full_name: "Неизвестный пользователь"
    };
  }

  return {
    user_id: user.id || "",
    username: user.username || "",
    full_name: [user.first_name || "", user.last_name || ""].join(" ").trim()
  };
}

function switchPage(page) {
  state.currentPage = page;

  document.querySelectorAll(".page").forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".pill-btn").forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".bottom-btn").forEach((el) => el.classList.remove("active"));

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add("active");

  document.querySelectorAll(`[data-page="${page}"]`).forEach((el) => el.classList.add("active"));
}

function renderProducts(filter = "") {
  const list = document.getElementById("productsList");
  list.innerHTML = "";

  const query = filter.trim().toLowerCase();

  const filtered = PRODUCTS.filter((item) => {
    return (
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    );
  });

  if (!filtered.length) {
    list.innerHTML = `
      <section class="section-box">
        <div class="empty-box">
          <div class="empty-title">Ничего не найдено</div>
          <div class="empty-text">Попробуй изменить запрос.</div>
        </div>
      </section>
    `;
    return;
  }

  filtered.forEach((item) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-image"></div>
      <div class="product-row">
        <h3 class="product-title">${item.name}</h3>
        <div class="product-price">${formatPrice(item.price)}</div>
      </div>
      <div class="product-desc">${item.description}</div>
      <div class="card-actions">
        <button class="primary-btn" data-add-id="${item.id}">В корзину</button>
      </div>
    `;
    list.appendChild(card);
  });

  document.querySelectorAll("[data-add-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      addToCart(Number(btn.dataset.addId));
    });
  });
}

function addToCart(productId) {
  const found = PRODUCTS.find((item) => item.id === productId);
  if (!found) return;

  const existing = state.cart.find((item) => item.id === productId);

  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      ...found,
      quantity: 1
    });
  }

  updateCartUI();
  showToast("Товар добавлен в корзину");
}

function changeQuantity(productId, delta) {
  const item = state.cart.find((x) => x.id === productId);
  if (!item) return;

  item.quantity += delta;

  if (item.quantity <= 0) {
    state.cart = state.cart.filter((x) => x.id !== productId);
  }

  updateCartUI();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter((item) => item.id !== productId);
  updateCartUI();
}

function getCartCount() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function getCartTotal() {
  return state.cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
}

function updateCartUI() {
  const topCartBtn = document.getElementById("topCartBtn");
  const bottomCartBtn = document.getElementById("bottomCartBtn");
  const topCartCount = document.getElementById("topCartCount");
  const cartEmpty = document.getElementById("cartEmpty");
  const cartContent = document.getElementById("cartContent");
  const cartItems = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");

  const count = getCartCount();

  topCartCount.textContent = count;

  if (count > 0) {
    topCartBtn.classList.remove("cart-hidden");
    bottomCartBtn.classList.remove("cart-hidden");
    cartEmpty.classList.add("hidden");
    cartContent.classList.remove("hidden");
  } else {
    topCartBtn.classList.add("cart-hidden");
    bottomCartBtn.classList.add("cart-hidden");
    cartEmpty.classList.remove("hidden");
    cartContent.classList.add("hidden");

    if (state.currentPage === "cart") {
      switchPage("catalog");
    }
  }

  cartItems.innerHTML = "";

  state.cart.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <h3 class="cart-item-title">${item.name}</h3>
      <div class="cart-item-meta">${formatPrice(item.price)} × ${item.quantity}</div>
      <div class="cart-item-meta">Сумма: ${formatPrice(item.price * item.quantity)}</div>

      <div class="item-actions" style="margin-top:12px;">
        <button class="soft-btn" data-minus-id="${item.id}">−</button>
        <button class="soft-btn" data-plus-id="${item.id}">+</button>
        <button class="small-btn" data-remove-id="${item.id}">Удалить</button>
      </div>
    `;
    cartItems.appendChild(row);
  });

  document.querySelectorAll("[data-minus-id]").forEach((btn) => {
    btn.addEventListener("click", () => changeQuantity(Number(btn.dataset.minusId), -1));
  });

  document.querySelectorAll("[data-plus-id]").forEach((btn) => {
    btn.addEventListener("click", () => changeQuantity(Number(btn.dataset.plusId), 1));
  });

  document.querySelectorAll("[data-remove-id]").forEach((btn) => {
    btn.addEventListener("click", () => removeFromCart(Number(btn.dataset.removeId)));
  });

  cartTotal.textContent = formatPrice(getCartTotal());
}

async function sendToGoogleSheets(payload) {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    console.log("Google Sheets response:", text);
    return true;
  } catch (error) {
    console.error("sendToGoogleSheets error:", error);
    return false;
  }
}

async function submitCartOrder() {
  if (!state.cart.length) {
    showToast("Корзина пустая");
    return;
  }

  const user = getUserData();
  const delivery = document.getElementById("deliveryCheckbox").checked ? "да" : "нет";

  const itemsText = state.cart
    .map((item) => `${item.name} × ${item.quantity} = ${item.price * item.quantity} ₽`)
    .join("; ");

  const payload = {
    created_at: new Date().toLocaleString("ru-RU"),
    type: "cart_order",
    user_id: user.user_id,
    username: user.username,
    full_name: user.full_name,
    products: itemsText,
    total: String(getCartTotal()),
    delivery: delivery,
    comment: "Заказ из корзины",
    status: "Новая заявка"
  };

  const ok = await sendToGoogleSheets(payload);

  if (ok) {
    showToast("Заказ отправлен");
    state.cart = [];
    document.getElementById("deliveryCheckbox").checked = false;
    updateCartUI();
    switchPage("catalog");
  } else {
    showToast("Не удалось создать заказ");
  }
}

async function submitCustomOrder() {
  const customText = document.getElementById("customText").value.trim();

  if (!customText) {
    showToast("Опиши свой заказ");
    return;
  }

  const user = getUserData();
  const delivery = document.getElementById("customDeliveryCheckbox").checked ? "да" : "нет";

  const payload = {
    created_at: new Date().toLocaleString("ru-RU"),
    type: "custom_order",
    user_id: user.user_id,
    username: user.username,
    full_name: user.full_name,
    products: customText,
    total: "",
    delivery: delivery,
    comment: "Кастомный заказ",
    status: "Новая заявка"
  };

  const ok = await sendToGoogleSheets(payload);

  if (ok) {
    showToast("Заявка отправлена");
    document.getElementById("customText").value = "";
    document.getElementById("customDeliveryCheckbox").checked = false;
    switchPage("catalog");
  } else {
    showToast("Не удалось отправить заявку");
  }
}

document.querySelectorAll("[data-page]").forEach((btn) => {
  btn.addEventListener("click", () => {
    switchPage(btn.dataset.page);
  });
});

document.getElementById("searchInput").addEventListener("input", (e) => {
  renderProducts(e.target.value);
});

document.getElementById("submitCartOrderBtn").addEventListener("click", submitCartOrder);
document.getElementById("submitCustomOrderBtn").addEventListener("click", submitCustomOrder);

renderProducts();
updateCartUI();
switchPage("catalog");
