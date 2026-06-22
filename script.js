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
    description: "Ручная работа, удобен для настольных игр и хранения кубиков."
  },
  {
    id: 2,
    name: "Деревянный сундук",
    price: 3500,
    description: "Сувенирный сундук для хранения мелочей, подарков и аксессуаров."
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
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function switchPage(page) {
  state.currentPage = page;

  document.querySelectorAll(".page").forEach((pageEl) => {
    pageEl.classList.remove("active");
  });

  document.querySelectorAll(".menu-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  document.getElementById(`page-${page}`).classList.add("active");
  document.querySelector(`.menu-btn[data-page="${page}"]`).classList.add("active");
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

function formatPrice(value) {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

function renderProducts(filter = "") {
  const wrap = document.getElementById("productsList");
  wrap.innerHTML = "";

  const normalized = filter.trim().toLowerCase();

  const filtered = PRODUCTS.filter((item) => {
    return (
      item.name.toLowerCase().includes(normalized) ||
      item.description.toLowerCase().includes(normalized)
    );
  });

  if (!filtered.length) {
    wrap.innerHTML = `<div class="empty-box">Ничего не найдено.</div>`;
    return;
  }

  filtered.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <h3 class="product-title">${product.name}</h3>
      <div class="product-desc">${product.description}</div>
      <div class="product-price">${formatPrice(product.price)}</div>
      <button class="primary-btn" data-add-id="${product.id}">В корзину</button>
    `;
    wrap.appendChild(card);
  });

  document.querySelectorAll("[data-add-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.addId);
      addToCart(id);
    });
  });
}

function addToCart(productId) {
  const product = PRODUCTS.find((item) => item.id === productId);
  if (!product) return;

  const existing = state.cart.find((item) => item.id === productId);

  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      ...product,
      quantity: 1
    });
  }

  updateCartUI();
  showToast("Товар добавлен в корзину");
}

function removeFromCart(productId) {
  state.cart = state.cart.filter((item) => item.id !== productId);
  updateCartUI();
}

function changeQuantity(productId, delta) {
  const item = state.cart.find((x) => x.id === productId);
  if (!item) return;

  item.quantity += delta;

  if (item.quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  updateCartUI();
}

function getCartCount() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function getCartTotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function updateCartUI() {
  const cartBtn = document.getElementById("cartMenuBtn");
  const cartCount = document.getElementById("cartCount");
  const cartEmpty = document.getElementById("cartEmpty");
  const cartContent = document.getElementById("cartContent");
  const cartItems = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");

  const count = getCartCount();
  cartCount.textContent = count;

  if (count > 0) {
    cartBtn.classList.remove("cart-hidden");
    cartEmpty.classList.add("hidden");
    cartContent.classList.remove("hidden");
  } else {
    cartBtn.classList.add("cart-hidden");
    cartEmpty.classList.remove("hidden");
    cartContent.classList.add("hidden");
  }

  cartItems.innerHTML = "";

  state.cart.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div class="cart-item-row">
        <div>
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-meta">${formatPrice(item.price)} × ${item.quantity}</div>
        </div>
        <div class="cart-item-actions">
          <button class="secondary-btn" data-minus-id="${item.id}">-</button>
          <button class="secondary-btn" data-plus-id="${item.id}">+</button>
          <button class="secondary-btn" data-remove-id="${item.id}">Удалить</button>
        </div>
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
  const text = document.getElementById("customText").value.trim();

  if (!text) {
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
    products: text,
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

document.querySelectorAll(".menu-btn").forEach((btn) => {
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
