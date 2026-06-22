const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwl-EtuwHC_UIzo2qKTB9MZNxo7bqynx2zfPWFDFyESXa2W0R84taOAgtyZYG3s07H2xw/exec";
const CONTACT_TELEGRAM_URL = "https://t.me/cringeator";

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
  delivery: false
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
      }
      if (state.currentScreen === "custom") {
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

  document.querySelectorAll(".tab-button").forEach(button => {
    button.classList.toggle("active", button.dataset.screen === screenName);
  });

  updateMainButton();
}

function updateMainButton() {
  if (!tg?.MainButton) return;

  if (state.currentScreen === "cart" && getCartItems().length) {
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
    return [product.name, product.description, product.size]
      .join(" ")
      .toLowerCase()
      .includes(query);
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
  updateCartButton();
  showToast(`Товар «${product.name}» добавлен в корзину.`);
}

function removeFromCart(productId) {
  delete state.cart[productId];
  renderCart();
  updateCartButton();

  if (!getCartItems().length && state.currentScreen === "cart") {
    setScreen("catalog");
  }
}

function changeQty(productId, delta) {
  const item = state.cart[productId];
  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    delete state.cart[productId];
  }

  renderCart();
  updateCartButton();

  if (!getCartItems().length && state.currentScreen === "cart") {
    setScreen("catalog");
  }
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

function updateCartButton() {
  const cartButton = document.getElementById("cartButton");
  const cartBadge = document.getElementById("cartBadge");
  const count = getCartCount();

  if (!cartButton || !cartBadge) return;

  if (count > 0) {
    cartButton.classList.remove("hidden");
    cartBadge.textContent = String(count);
  } else {
    cartButton.classList.add("hidden");
    cartBadge.textContent = "0";
  }

  updateMainButton();
}

function renderProducts() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  const list = getFilteredProducts();

  if (!list.length) {
    grid.innerHTML = `<div class="placeholder-card">Ничего не найдено по вашему запросу.</div>`;
    return;
  }

  grid.innerHTML = list.map(product => `
    <article class="product-card">
      <img class="product-image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
      <div class="product-body">
        <h3 class="product-name">${escapeHtml(product.name)}</h3>
        ${product.oldPrice ? `<div class="product-price-old">${escapeHtml(product.oldPrice)}</div>` : ""}
        <div class="product-price">${product.price} руб.</div>
        <div class="product-desc">${escapeHtml(product.description)}</div>
        <div class="product-meta">${escapeHtml(product.size || "")}</div>

        <div class="product-actions">
          <button class="primary-button" type="button" data-add="${escapeHtml(product.id)}">В корзину</button>
        </div>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll("[data-add]").forEach(button => {
    button.addEventListener("click", () => addToCart(button.dataset.add));
  });
}

function renderCart() {
  const panel = document.getElementById("cartPanel");
  if (!panel) return;

  const items = getCartItems();

  if (!items.length) {
    panel.innerHTML = `<div class="placeholder-card">Корзина пока пуста.</div>`;
    updateMainButton();
    return;
  }

  panel.innerHTML = `
    ${items.map(item => `
      <div class="cart-item">
        <div class="cart-item-top">
          <div>
            <div class="cart-item-name">${escapeHtml(item.product.name)}</div>
            <div class="cart-item-line">${item.product.price} ₽ × ${item.qty} = ${item.lineTotal} ₽</div>
          </div>
          <button class="remove-button" type="button" data-remove="${escapeHtml(item.product.id)}">Удалить</button>
        </div>

        <div class="qty-row">
          <button class="qty-button" type="button" data-minus="${escapeHtml(item.product.id)}">−</button>
          <div class="qty-value">${item.qty}</div>
          <button class="qty-button" type="button" data-plus="${escapeHtml(item.product.id)}">+</button>
        </div>
      </div>
    `).join("")}

    <div class="cart-summary">
      <div class="summary-row">
        <span>Итого</span>
        <span>${getCartTotal()} ₽</span>
      </div>

      <label class="check-row" style="margin-bottom: 14px;">
        <input type="checkbox" id="cartDeliveryCheckbox" ${state.delivery ? "checked" : ""}>
        <span>Нужна доставка</span>
      </label>

      <button class="primary-button" type="button" id="cartSubmitButton">Оформить весь заказ</button>
    </div>
  `;

  panel.querySelectorAll("[data-remove]").forEach(button => {
    button.addEventListener("click", () => removeFromCart(button.dataset.remove));
  });

  panel.querySelectorAll("[data-minus]").forEach(button => {
    button.addEventListener("click", () => changeQty(button.dataset.minus, -1));
  });

  panel.querySelectorAll("[data-plus]").forEach(button => {
    button.addEventListener("click", () => changeQty(button.dataset.plus, 1));
  });

  const deliveryCheckbox = document.getElementById("cartDeliveryCheckbox");
  if (deliveryCheckbox) {
    deliveryCheckbox.addEventListener("change", () => {
      state.delivery = deliveryCheckbox.checked;
    });
  }

  const submitButton = document.getElementById("cartSubmitButton");
  if (submitButton) {
    submitButton.addEventListener("click", submitCartOrder);
  }

  updateMainButton();
}

async function sendToGoogleSheets(payload) {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      redirect: "follow",
      body: JSON.stringify(payload)
    });

    await response.text();
    return true;
  } catch (error) {
    console.error("Google Sheets error:", error);
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
    delivery: state.delivery ? "да" : "нет",
    payment_link: "",
    comment: "Заказ из корзины",
    status: "Новая заявка"
  };

  const ok = await sendToGoogleSheets(payload);

  if (ok) {
    showToast("Заказ отправлен. Мы скоро свяжемся с вами.");
    state.cart = {};
    state.delivery = false;
    renderCart();
    updateCartButton();
    setScreen("catalog");
  } else {
    showToast("Не удалось отправить заказ. Нажмите «Написать».");
  }
}

async function submitCustomOrder() {
  const title = document.getElementById("customTitle");
  const description = document.getElementById("customDescription");
  const size = document.getElementById("customSize");
  const qty = document.getElementById("customQty");
  const delivery = document.getElementById("customDelivery");
  const accept = document.getElementById("customAccept");

  if (!title || !description || !size || !qty || !delivery || !accept) {
    showToast("Форма не найдена.");
    return;
  }

  if (!title.value.trim()) {
    showToast("Укажите название изделия.");
    return;
  }

  if (!description.value.trim()) {
    showToast("Опишите вашу идею.");
    return;
  }

  if (!accept.checked) {
    showToast("Подтвердите, что стоимость уточняется отдельно.");
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
    showToast("Заявка отправлена. Мы скоро свяжемся с вами.");
    title.value = "";
    description.value = "";
    size.value = "";
    qty.value = "1";
    delivery.checked = false;
    accept.checked = false;
    setScreen("catalog");
  } else {
    showToast("Не удалось отправить заявку. Нажмите «Написать».");
  }
}

function bindEvents() {
  document.querySelectorAll(".tab-button").forEach(button => {
    button.addEventListener("click", () => {
      setScreen(button.dataset.screen);
    });
  });

  const cartButton = document.getElementById("cartButton");
  if (cartButton) {
    cartButton.addEventListener("click", () => setScreen("cart"));
  }

  const contactsOpenButton = document.getElementById("contactsOpenButton");
  if (contactsOpenButton) {
    contactsOpenButton.addEventListener("click", () => setScreen("contacts"));
  }

  const customSubmitButton = document.getElementById("customSubmitButton");
  if (customSubmitButton) {
    customSubmitButton.addEventListener("click", submitCustomOrder);
  }

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.search = searchInput.value;
      renderProducts();
    });
  }
}

function init() {
  initTelegram();
  bindEvents();
  renderProducts();
  renderCart();
  updateCartButton();
  setScreen("catalog");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
