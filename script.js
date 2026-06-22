const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxbgaDISNV0PSFJ6c_cHo6z-pgL-Vcrk8bY6oUMaVldJdp3HbB5pgXZKBoNRAt3zwvhpg/exec";

const PRODUCTS = [
  {
    id: "dicejail",
    name: "DiceJail",
    oldPrice: "",
    price: 1500,
    description: "Тюрьма для непослушных дайсов из дерева. Все 4 стороны поднимаются вверх.",
    size: "Размеры: 10×10×11 см",
    image: "https://i.ibb.co/W4kMscBv/Frame-2.jpg"
  },
  {
    id: "dicetray",
    name: "Дайс трей",
    oldPrice: "",
    price: 1500,
    description: "Лоток для кубиков, удобный аксессуар для настольных игр.",
    size: "Размеры: 21×21×3 см",
    image: "https://i.ibb.co/Mydq6V17/Frame-1.jpg"
  }
];

const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

const state = {
  currentScreen: "catalog",
  cart: {},
  search: "",
  orderDelivery: false
};

function initTelegram() {
  if (!tg) return;

  tg.ready();
  tg.expand();

  if (tg.MainButton) {
    tg.MainButton.hide();
    tg.MainButton.onClick(() => {
      if (state.currentScreen === "cart") {
        submitCartOrder();
      } else if (state.currentScreen === "custom") {
        submitCustomOrder();
      }
    });
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(text) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = text;
  toast.classList.remove("hidden");

  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3200);
}

function getTelegramUserData() {
  const user = tg?.initDataUnsafe?.user || null;

  return {
    username: user?.username || "",
    user_id: user?.id || "",
    full_name: [user?.first_name || "", user?.last_name || ""].join(" ").trim()
  };
}

function setScreen(screenName) {
  state.currentScreen = screenName;

  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.toggle("active", screen.id === `screen-${screenName}`);
  });

  document.querySelectorAll(".top-menu-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.screen === screenName);
  });

  updateMainButton();
}

function updateMainButton() {
  if (!tg?.MainButton) return;

  if (state.currentScreen === "cart" && getCartItems().length > 0) {
    tg.MainButton.setText("Оформить заказ");
    tg.MainButton.show();
    return;
  }

  if (state.currentScreen === "custom") {
    tg.MainButton.setText("Отправить заявку");
    tg.MainButton.show();
    return;
  }

  tg.MainButton.hide();
}

function getProductById(id) {
  return PRODUCTS.find(product => product.id === id);
}

function getFilteredProducts() {
  const query = state.search.trim().toLowerCase();

  if (!query) return PRODUCTS;

  return PRODUCTS.filter(product => {
    const text = [product.name, product.description, product.size].join(" ").toLowerCase();
    return text.includes(query);
  });
}

function addToCart(productId) {
  const product = getProductById(productId);
  if (!product) return;

  if (!state.cart[productId]) {
    state.cart[productId] = {
      productId,
      qty: 0
    };
  }

  state.cart[productId].qty += 1;
  renderCart();
  updateCartIcon();
  showToast(`Товар «${product.name}» добавлен в корзину.`);
}

function removeFromCart(productId) {
  delete state.cart[productId];
  renderCart();
  updateCartIcon();
}

function changeQty(productId, delta) {
  const item = state.cart[productId];
  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    delete state.cart[productId];
  }

  renderCart();
  updateCartIcon();
}

function getCartItems() {
  return Object.values(state.cart)
    .map(item => {
      const product = getProductById(item.productId);
      if (!product) return null;

      return {
        ...item,
        product,
        lineTotal: product.price * item.qty
      };
    })
    .filter(Boolean);
}

function getCartCount() {
  return getCartItems().reduce((sum, item) => sum + item.qty, 0);
}

function getCartTotal() {
  return getCartItems().reduce((sum, item) => sum + item.lineTotal, 0);
}

function updateCartIcon() {
  const cartIcon = document.getElementById("cartIcon");
  const cartCount = document.getElementById("cartCount");
  const count = getCartCount();

  if (!cartIcon || !cartCount) return;

  if (count > 0) {
    cartIcon.classList.remove("hidden");
    cartCount.textContent = String(count);
  } else {
    cartIcon.classList.add("hidden");
    cartCount.textContent = "0";
  }

  updateMainButton();
}

function renderProducts() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  const filtered = getFilteredProducts();

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-card">Ничего не найдено.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(product => `
    <article class="product-card">
      <img class="product-image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
      <div class="product-body">
        <h3 class="product-name">${escapeHtml(product.name)}</h3>
        ${product.oldPrice ? `<div class="product-price-old">${escapeHtml(product.oldPrice)}</div>` : ""}
        <div class="product-price">${product.price} руб.</div>
        <div class="product-desc">${escapeHtml(product.description)}</div>
        <div class="product-meta">${escapeHtml(product.size || "")}</div>

        <div class="product-actions">
          <button class="primary-btn" type="button" data-add="${escapeHtml(product.id)}">В корзину</button>
        </div>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll("[data-add]").forEach(button => {
    button.addEventListener("click", () => addToCart(button.dataset.add));
  });
}

function renderCart() {
  const box = document.getElementById("cartBox");
  if (!box) return;

  const items = getCartItems();

  if (!items.length) {
    box.innerHTML = `<div class="empty-card">Корзина пока пуста.</div>`;
    updateMainButton();
    return;
  }

  box.innerHTML = `
    ${items.map(item => `
      <div class="cart-item">
        <div class="cart-row">
          <div>
            <div class="cart-name">${escapeHtml(item.product.name)}</div>
            <div class="cart-line">${item.product.price} ₽ × ${item.qty} = ${item.lineTotal} ₽</div>
          </div>
          <button class="remove-btn" type="button" data-remove="${escapeHtml(item.product.id)}">Удалить</button>
        </div>

        <div class="qty-row">
          <button class="qty-btn" type="button" data-minus="${escapeHtml(item.product.id)}">−</button>
          <div class="qty-value">${item.qty}</div>
          <button class="qty-btn" type="button" data-plus="${escapeHtml(item.product.id)}">+</button>
        </div>
      </div>
    `).join("")}

    <div class="cart-summary">
      <label class="check-line">
        <input type="checkbox" id="orderDeliveryCheckbox" ${state.orderDelivery ? "checked" : ""}>
        <span>Нужна <a href="#" id="openDeliveryFromCart">доставка</a></span>
      </label>

      <div class="summary-line">
        <span>Итого</span>
        <span>${getCartTotal()} ₽</span>
      </div>

      <button class="primary-btn" type="button" id="cartSubmitBtn">Оформить весь заказ</button>
    </div>
  `;

  box.querySelectorAll("[data-remove]").forEach(button => {
    button.addEventListener("click", () => removeFromCart(button.dataset.remove));
  });

  box.querySelectorAll("[data-minus]").forEach(button => {
    button.addEventListener("click", () => changeQty(button.dataset.minus, -1));
  });

  box.querySelectorAll("[data-plus]").forEach(button => {
    button.addEventListener("click", () => changeQty(button.dataset.plus, 1));
  });

  const orderDeliveryCheckbox = document.getElementById("orderDeliveryCheckbox");
  if (orderDeliveryCheckbox) {
    orderDeliveryCheckbox.addEventListener("change", () => {
      state.orderDelivery = orderDeliveryCheckbox.checked;
    });
  }

  const openDeliveryFromCart = document.getElementById("openDeliveryFromCart");
  if (openDeliveryFromCart) {
    openDeliveryFromCart.addEventListener("click", (e) => {
      e.preventDefault();
      setScreen("delivery");
    });
  }

  const cartSubmitBtn = document.getElementById("cartSubmitBtn");
  if (cartSubmitBtn) {
    cartSubmitBtn.addEventListener("click", submitCartOrder);
  }

  updateMainButton();
}

async function sendToGoogleSheets(payload) {
  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    return true;
  } catch (error) {
    console.error("sendToGoogleSheets error:", error);
    return false;
  }
}

async function submitCartOrder() {
  const items = getCartItems();

  if (!items.length) {
    showToast("Корзина пуста.");
    return;
  }

  const user = getTelegramUserData();

  const payload = {
    type: "cart_order",
    created_at: new Date().toLocaleString("ru-RU"),
    username: user.username,
    user_id: user.user_id,
    full_name: user.full_name,
    products: items.map(item =>
      `${item.product.name} × ${item.qty} (${item.lineTotal} ₽)`
    ).join(" | "),
    total: getCartTotal(),
    delivery: state.orderDelivery ? "да" : "нет",
    payment_link: "",
    comment: "Заказ из корзины",
    status: "Новая заявка"
  };

  const ok = await sendToGoogleSheets(payload);

  if (ok) {
    showToast("Заказ отправлен. Администратор свяжется с вами.");
    state.cart = {};
    state.orderDelivery = false;
    renderCart();
    updateCartIcon();
    setScreen("catalog");
  } else {
    showToast("Не удалось создать заказ. Нажмите «Написать».");
  }
}

async function submitCustomOrder() {
  const title = document.getElementById("customTitle");
  const description = document.getElementById("customDescription");
  const size = document.getElementById("customSize");
  const qty = document.getElementById("customQty");
  const delivery = document.getElementById("customDelivery");
  const accept = document.getElementById("customAccept");

  if (!title.value.trim()) {
    showToast("Укажите название изделия.");
    return;
  }

  if (!description.value.trim()) {
    showToast("Опишите идею.");
    return;
  }

  if (!accept.checked) {
    showToast("Поставьте галочку про стоимость.");
    return;
  }

  const user = getTelegramUserData();

  const payload = {
    type: "custom_order",
    created_at: new Date().toLocaleString("ru-RU"),
    username: user.username,
    user_id: user.user_id,
    full_name: user.full_name,
    products: `Кастомный заказ: ${title.value.trim()}`,
    total: "Уточняется",
    delivery: delivery.checked ? "да" : "нет",
    payment_link: "",
    comment:
      `Описание: ${description.value.trim()} | ` +
      `Размеры: ${size.value.trim() || "не указаны"} | ` +
      `Количество: ${qty.value || "1"}`,
    status: "Новая кастомная заявка"
  };

  const ok = await sendToGoogleSheets(payload);

  if (ok) {
    showToast("Заявка отправлена. Администратор свяжется с вами.");
    title.value = "";
    description.value = "";
    size.value = "";
    qty.value = "1";
    delivery.checked = false;
    accept.checked = false;
    setScreen("catalog");
  } else {
    showToast("Не удалось создать заявку. Нажмите «Написать».");
  }
}

function bindEvents() {
  document.querySelectorAll(".top-menu-btn").forEach(button => {
    button.addEventListener("click", () => {
      setScreen(button.dataset.screen);
    });
  });

  const cartIcon = document.getElementById("cartIcon");
  if (cartIcon) {
    cartIcon.addEventListener("click", () => setScreen("cart"));
  }

  const contactsBtn = document.getElementById("contactsBtn");
  if (contactsBtn) {
    contactsBtn.addEventListener("click", () => setScreen("contacts"));
  }

  const customSubmitBtn = document.getElementById("customSubmitBtn");
  if (customSubmitBtn) {
    customSubmitBtn.addEventListener("click", submitCustomOrder);
  }

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.search = searchInput.value;
      renderProducts();
    });
  }

  const openDeliveryFromCustom = document.getElementById("openDeliveryFromCustom");
  if (openDeliveryFromCustom) {
    openDeliveryFromCustom.addEventListener("click", (e) => {
      e.preventDefault();
      setScreen("delivery");
    });
  }
}

function init() {
  initTelegram();
  bindEvents();
  renderProducts();
  renderCart();
  updateCartIcon();
  setScreen("catalog");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
