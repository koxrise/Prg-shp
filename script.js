const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzACBWqe_q3xl1VCWpAlqR6Y8RzfY2v1nDuuJr3lmosjYEsAFQh1ZcDZaoXNtosnO1qVQ/exec";
const ADMIN_CONTACT_URL = "https://t.me/cringeator";

/*
  ЗДЕСЬ ВАМ НУЖНО ЗАМЕНИТЬ ТЕСТОВЫЕ ТОВАРЫ НА ВАШИ РЕАЛЬНЫЕ.
  Для каждого товара:
  - id: уникальный короткий id
  - name: название
  - price: цена числом
  - description: описание
  - size: строка с размерами, можно пустую
  - image: ссылка на картинку
  - payment_url: ваша ссылка на оплату
*/
const PRODUCTS = [
  {
    id: "dicejail",
    name: "DiceJail",
    price: 1500,
    description: "Тюрьма для самых непослушных дайсов. Исполнена из дерева, все 4 стороны поднимаются вверх.",
    size: "Размеры: 10×10×11 см",
    image: "https://i.ibb.co/W4kMscBv/Frame-2.jpg",
    payment_url: "https://example.com/pay-dicejail"
  },
  {
    id: "dicetray",
    name: "Дайс трей",
    price: 1500,
    description: "Лоток для кубиков, идеален для настольных игр и красивой подачи аксессуаров.",
    size: "Размеры: 21×21×3 см",
    image: "https://i.ibb.co/Mydq6V17/Frame-1.jpg",
    payment_url: "https://example.com/pay-dicetray"
  }
];

const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

const state = {
  currentScreen: "home",
  history: ["home"],
  cart: {}
};

function initTelegram() {
  if (!tg) return;

  tg.ready();
  tg.expand();

  applyTelegramTheme();
  setupTelegramButtons();
}

function applyTelegramTheme() {
  if (!tg || !tg.themeParams) return;

  const theme = tg.themeParams;
  const root = document.documentElement;

  if (theme.bg_color) root.style.setProperty("--tg-bg", theme.bg_color);
  if (theme.secondary_bg_color) root.style.setProperty("--tg-secondary-bg", theme.secondary_bg_color);
  if (theme.text_color) root.style.setProperty("--tg-text", theme.text_color);
  if (theme.hint_color) root.style.setProperty("--tg-hint", theme.hint_color);
  if (theme.link_color) root.style.setProperty("--tg-link", theme.link_color);
  if (theme.button_color) root.style.setProperty("--tg-button", theme.button_color);
  if (theme.button_text_color) root.style.setProperty("--tg-button-text", theme.button_text_color);
}

function setupTelegramButtons() {
  if (!tg) return;

  if (tg.BackButton) {
    tg.BackButton.onClick(goBack);
  }

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

function showToast(text) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = text;
  toast.classList.remove("hidden");

  clearTimeout(window.__toastTimeout);
  window.__toastTimeout = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3200);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTelegramUserData() {
  const user = tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;

  return {
    username: user?.username || "",
    user_id: user?.id || "",
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    full_name: [user?.first_name || "", user?.last_name || ""].join(" ").trim()
  };
}

function navigate(screenName, push = true) {
  const allScreens = document.querySelectorAll(".screen");
  allScreens.forEach(screen => screen.classList.remove("active"));

  const target = document.getElementById(`screen-${screenName}`);
  if (target) {
    target.classList.add("active");
  }

  state.currentScreen = screenName;

  if (push) {
    const last = state.history[state.history.length - 1];
    if (last !== screenName) {
      state.history.push(screenName);
    }
  }

  updateBackButton();
  updateMainButton();
}

function goBack() {
  if (state.currentScreen === "home") return;

  if (state.history.length > 1) {
    state.history.pop();
    const prev = state.history[state.history.length - 1] || "home";
    navigate(prev, false);
  } else {
    navigate("home", false);
  }
}

function updateBackButton() {
  const localBtn = document.getElementById("backBtnInside");
  const show = state.currentScreen !== "home";

  if (localBtn) {
    localBtn.classList.toggle("hidden", !show);
  }

  if (tg && tg.BackButton) {
    if (show) tg.BackButton.show();
    else tg.BackButton.hide();
  }
}

function updateMainButton() {
  if (!tg || !tg.MainButton) return;

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
  return PRODUCTS.find(item => item.id === id);
}

function addToCart(productId) {
  const product = getProductById(productId);
  if (!product) return;

  if (!state.cart[productId]) {
    state.cart[productId] = {
      productId,
      qty: 0,
      delivery: false
    };
  }

  state.cart[productId].qty += 1;
  renderCart();
  updateCartFab();
  showToast(`Товар «${product.name}» добавлен в корзину.`);
}

function changeCartQty(productId, delta) {
  const item = state.cart[productId];
  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    delete state.cart[productId];
  }

  renderCart();
  updateCartFab();

  if (!getCartItems().length && state.currentScreen === "cart") {
    navigate("catalog");
  }
}

function removeFromCart(productId) {
  delete state.cart[productId];
  renderCart();
  updateCartFab();

  if (!getCartItems().length && state.currentScreen === "cart") {
    navigate("catalog");
  }
}

function toggleCartDelivery(productId, checked) {
  if (!state.cart[productId]) return;
  state.cart[productId].delivery = checked;
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

function updateCartFab() {
  const fab = document.getElementById("cartFab");
  const countEl = document.getElementById("cartFabCount");
  const count = getCartCount();

  if (!fab || !countEl) return;

  if (count > 0) {
    fab.classList.remove("hidden");
    countEl.textContent = String(count);
  } else {
    fab.classList.add("hidden");
    countEl.textContent = "0";
  }

  updateMainButton();
}

function renderProducts() {
  const container = document.getElementById("productsGrid");
  if (!container) return;

  if (!PRODUCTS.length) {
    container.innerHTML = `<div class="empty-state-box">Товары пока не добавлены.</div>`;
    return;
  }

  container.innerHTML = PRODUCTS.map(product => `
    <article class="product-card">
      <img class="product-image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
      <div class="product-body">
        <div class="product-top">
          <h3 class="product-title">${escapeHtml(product.name)}</h3>
          <div class="product-price">${product.price} ₽</div>
        </div>

        <div class="product-desc">${escapeHtml(product.description)}</div>
        <div class="product-meta">${escapeHtml(product.size || "Размеры уточняются")}</div>

        <div class="product-actions">
          <button class="primary-btn" type="button" data-add="${escapeHtml(product.id)}">
            В корзину
          </button>

          <a class="secondary-btn" href="${escapeHtml(product.payment_url)}" target="_blank" rel="noopener noreferrer">
            Оплатить отдельно
          </a>

          <a class="ghost-btn" href="${ADMIN_CONTACT_URL}" target="_blank" rel="noopener noreferrer">
            Написать администратору
          </a>
        </div>
      </div>
    </article>
  `).join("");

  container.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => addToCart(btn.dataset.add));
  });
}

function renderCart() {
  const panel = document.getElementById("cartPanel");
  if (!panel) return;

  const items = getCartItems();

  if (!items.length) {
    panel.innerHTML = `<div class="empty-state-box">Корзина пока пуста.</div>`;
    updateMainButton();
    return;
  }

  panel.innerHTML = `
    ${items.map(item => `
      <div class="cart-item">
        <div class="cart-head">
          <div>
            <div class="cart-name">${escapeHtml(item.product.name)}</div>
            <div class="cart-line">${item.product.price} ₽ × ${item.qty} = ${item.lineTotal} ₽</div>
          </div>
          <button class="remove-btn" type="button" data-remove="${escapeHtml(item.product.id)}">Удалить</button>
        </div>

        <label class="checkbox-row">
          <input type="checkbox" data-delivery="${escapeHtml(item.product.id)}" ${item.delivery ? "checked" : ""}>
          <span>Нужна доставка для этой позиции</span>
        </label>

        <div class="qty-row">
          <button class="qty-btn" type="button" data-minus="${escapeHtml(item.product.id)}">−</button>
          <div class="qty-value">${item.qty}</div>
          <button class="qty-btn" type="button" data-plus="${escapeHtml(item.product.id)}">+</button>
        </div>
      </div>
    `).join("")}

    <div class="cart-summary">
      <div class="summary-line">
        <span>Итого</span>
        <span>${getCartTotal()} ₽</span>
      </div>

      <button class="primary-btn" type="button" id="cartSubmitLocalBtn">
        Оформить весь заказ
      </button>
    </div>
  `;

  panel.querySelectorAll("[data-minus]").forEach(btn => {
    btn.addEventListener("click", () => changeCartQty(btn.dataset.minus, -1));
  });

  panel.querySelectorAll("[data-plus]").forEach(btn => {
    btn.addEventListener("click", () => changeCartQty(btn.dataset.plus, 1));
  });

  panel.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => removeFromCart(btn.dataset.remove));
  });

  panel.querySelectorAll("[data-delivery]").forEach(checkbox => {
    checkbox.addEventListener("change", () => {
      toggleCartDelivery(checkbox.dataset.delivery, checkbox.checked);
    });
  });

  const localSubmitBtn = document.getElementById("cartSubmitLocalBtn");
  if (localSubmitBtn) {
    localSubmitBtn.addEventListener("click", submitCartOrder);
  }

  updateMainButton();
}

async function postToGoogleSheets(payload) {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error("Google Sheets POST error:", error);
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
  const productsText = items
    .map(item => `${item.product.name} × ${item.qty} (${item.lineTotal} ₽, доставка: ${item.delivery ? "да" : "нет"})`)
    .join(" | ");

  const linksText = items
    .map(item => `${item.product.name}: ${item.product.payment_url}`)
    .join(" | ");

  const payload = {
    type: "cart_order",
    created_at: new Date().toLocaleString("ru-RU"),
    username: user.username,
    user_id: user.user_id,
    full_name: user.full_name,
    products: productsText,
    total: getCartTotal(),
    delivery: items.some(item => item.delivery) ? "да" : "нет",
    payment_link: linksText,
    comment: "Заказ из корзины",
    status: "Новая заявка"
  };

  const ok = await postToGoogleSheets(payload);

  if (ok) {
    showToast("Заказ отправлен. Администратор свяжется с вами.");
    state.cart = {};
    renderCart();
    updateCartFab();
    navigate("home");
  } else {
    showToast("Не удалось отправить заказ. Напишите администратору вручную.");
  }
}

async function submitCustomOrder() {
  const title = document.getElementById("customTitle");
  const description = document.getElementById("customDescription");
  const size = document.getElementById("customSize");
  const qty = document.getElementById("customQty");
  const delivery = document.getElementById("customDelivery");
  const accept = document.getElementById("customAccept");

  if (!title || !description || !qty || !delivery || !accept) {
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

  const ok = await postToGoogleSheets(payload);

  if (ok) {
    showToast("Заявка отправлена. Администратор свяжется с вами в течение 24 часов.");
    title.value = "";
    description.value = "";
    size.value = "";
    qty.value = "1";
    delivery.checked = false;
    accept.checked = false;
    navigate("home");
  } else {
    showToast("Не удалось отправить заявку. Напишите администратору вручную.");
  }
}

function bindEvents() {
  document.querySelectorAll("[data-nav]").forEach(btn => {
    btn.addEventListener("click", () => {
      navigate(btn.dataset.nav);
    });
  });

  const localBackBtn = document.getElementById("backBtnInside");
  if (localBackBtn) {
    localBackBtn.addEventListener("click", goBack);
  }

  const cartFab = document.getElementById("cartFab");
  if (cartFab) {
    cartFab.addEventListener("click", () => navigate("cart"));
  }

  const customSubmitBtn = document.getElementById("customSubmitBtn");
  if (customSubmitBtn) {
    customSubmitBtn.addEventListener("click", submitCustomOrder);
  }
}

function init() {
  initTelegram();
  bindEvents();
  renderProducts();
  renderCart();
  updateCartFab();
  navigate("home", false);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
