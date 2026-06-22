const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzACBWqe_q3xl1VCWpAlqR6Y8RzfY2v1nDuuJr3lmosjYEsAFQh1ZcDZaoXNtosnO1qVQ/exec";
const ADMIN_CONTACT_URL = "https://t.me/cringeator";

const products = [
  {
    id: "dicejail",
    name: "DiceJail",
    price: 1500,
    description: "Тюрьма для самых непослушных дайсов. Исполнена из дерева, все 4 стороны поднимаются вверх. Возможно исполнение в трех цветах.",
    size: "Размеры: 10×10×11",
    image: "https://i.ibb.co/W4kMscBv/Frame-2.jpg",
    payment_url: "https://yookassa.ru/my/i/ajivKK4ijE__/l"
  },
  {
    id: "dicetray",
    name: "Дайс трей",
    price: 1500,
    description: "Лоток для кубиков, идеален для настольных игр.",
    size: "Размеры: 21×21×3",
    image: "https://i.ibb.co/Mydq6V17/Frame-1.jpg",
    payment_url: "https://yookassa.ru/my/i/ajivPXotscnv/l"
  }
];

const cart = {};
const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

if (tg) {
  tg.ready();
  tg.expand();
}

function escapeHtml(value) {
  return String(value)
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

function getProductById(productId) {
  return products.find(item => item.id === productId);
}

function addToCart(productId) {
  const item = getProductById(productId);
  if (!item) {
    showToast("Товар не найден.");
    return;
  }

  if (!cart[productId]) {
    cart[productId] = {
      productId,
      qty: 0,
      delivery: false
    };
  }

  cart[productId].qty += 1;
  renderCart();
  showToast(`Товар «${item.name}» добавлен в корзину.`);
}

function changeQty(productId, delta) {
  if (!cart[productId]) return;

  cart[productId].qty += delta;

  if (cart[productId].qty <= 0) {
    delete cart[productId];
  }

  renderCart();
}

function toggleCartDelivery(productId, checked) {
  if (!cart[productId]) return;
  cart[productId].delivery = checked;
  renderCart();
}

function getCartItems() {
  return Object.values(cart)
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

function getCartTotal() {
  return getCartItems().reduce((sum, item) => sum + item.lineTotal, 0);
}

function buildProductsHtml() {
  return products.map(product => `
    <article class="product-card">
      <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
      <div class="product-body">
        <div class="product-title">
          <h3>${escapeHtml(product.name)}</h3>
          <div class="price">${product.price} ₽</div>
        </div>

        <div class="product-desc">${escapeHtml(product.description)}</div>
        <div class="meta">${escapeHtml(product.size)}</div>

        <div class="actions">
          <button class="btn btn-primary" data-add="${escapeHtml(product.id)}">Добавить в корзину</button>
          <a class="btn btn-secondary" href="${escapeHtml(product.payment_url)}" target="_blank" rel="noopener noreferrer">Оплатить отдельно</a>
          <a class="btn btn-outline" href="${ADMIN_CONTACT_URL}" target="_blank" rel="noopener noreferrer">Написать администратору</a>
        </div>
      </div>
    </article>
  `).join("");
}

function renderProducts() {
  const container = document.getElementById("products");
  if (!container) return;

  container.innerHTML = buildProductsHtml();

  container.querySelectorAll("[data-add]").forEach(button => {
    button.addEventListener("click", () => {
      addToCart(button.dataset.add);
    });
  });
}

function buildCartHtml() {
  const items = getCartItems();

  if (!items.length) {
    return `<div class="empty-box">Корзина пока пуста.</div>`;
  }

  const itemsHtml = items.map(item => `
    <div class="cart-item">
      <div>
        <div class="cart-item-name">${escapeHtml(item.product.name)}</div>
        <div class="cart-item-meta">${item.product.price} ₽ × ${item.qty} = ${item.lineTotal} ₽</div>
        <label class="checkbox-line">
          <input type="checkbox" data-cart-delivery="${escapeHtml(item.product.id)}" ${item.delivery ? "checked" : ""}>
          <span>Нужна доставка для этой позиции</span>
        </label>
      </div>

      <div class="qty-row">
        <button class="qty-btn" data-minus="${escapeHtml(item.product.id)}">−</button>
        <div class="qty-value">${item.qty}</div>
        <button class="qty-btn" data-plus="${escapeHtml(item.product.id)}">+</button>
      </div>

      <div>
        <button class="btn btn-danger" data-remove="${escapeHtml(item.product.id)}">Удалить</button>
      </div>
    </div>
  `).join("");

  const total = getCartTotal();

  return `
    ${itemsHtml}
    <div class="cart-summary">
      <div class="summary-row">
        <span>Итого</span>
        <span>${total} ₽</span>
      </div>

      <div class="cart-actions">
        <button class="btn btn-primary" id="submitCartBtn">Оформить весь заказ</button>
        <a class="btn btn-outline" href="${ADMIN_CONTACT_URL}" target="_blank" rel="noopener noreferrer">Написать администратору</a>
      </div>
    </div>
  `;
}

function renderCart() {
  const box = document.getElementById("cartBox");
  if (!box) return;

  box.innerHTML = buildCartHtml();

  box.querySelectorAll("[data-minus]").forEach(button => {
    button.addEventListener("click", () => changeQty(button.dataset.minus, -1));
  });

  box.querySelectorAll("[data-plus]").forEach(button => {
    button.addEventListener("click", () => changeQty(button.dataset.plus, 1));
  });

  box.querySelectorAll("[data-remove]").forEach(button => {
    button.addEventListener("click", () => {
      delete cart[button.dataset.remove];
      renderCart();
    });
  });

  box.querySelectorAll("[data-cart-delivery]").forEach(checkbox => {
    checkbox.addEventListener("change", () => {
      toggleCartDelivery(checkbox.dataset.cartDelivery, checkbox.checked);
    });
  });

  const submitBtn = document.getElementById("submitCartBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", submitCartOrder);
  }
}

function getTelegramUser() {
  const user = tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;
  return {
    user_id: user && user.id ? user.id : "",
    username: user && user.username ? user.username : "",
    first_name: user && user.first_name ? user.first_name : "",
    last_name: user && user.last_name ? user.last_name : ""
  };
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

    return response.ok;
  } catch (error) {
    console.error("Google Sheets error:", error);
    return false;
  }
}

function sendToTelegramBot(payload) {
  if (!tg || typeof tg.sendData !== "function") {
    return false;
  }

  try {
    tg.sendData(JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error("Telegram sendData error:", error);
    return false;
  }
}

async function submitCartOrder() {
  const items = getCartItems();
  if (!items.length) {
    showToast("Корзина пуста.");
    return;
  }

  const telegramUser = getTelegramUser();
  const productsText = items.map(item => {
    const deliveryText = item.delivery ? "доставка: да" : "доставка: нет";
    return `${item.product.name} × ${item.qty} (${item.lineTotal} ₽, ${deliveryText})`;
  }).join(" | ");

  const paymentLinks = items.map(item => `${item.product.name}: ${item.product.payment_url}`).join(" | ");
  const anyDelivery = items.some(item => item.delivery) ? "да" : "нет";

  const payload = {
    type: "cart_order",
    created_at: new Date().toISOString(),
    ...telegramUser,
    full_name: `${telegramUser.first_name} ${telegramUser.last_name}`.trim(),
    products: productsText,
    total: getCartTotal(),
    delivery: anyDelivery,
    payment_link: paymentLinks,
    comment: "Заказ из корзины",
    status: "Новая заявка"
  };

  const [sheetOk] = await Promise.all([
    sendToGoogleSheets(payload)
  ]);

  const botOk = sendToTelegramBot(payload);

  if (sheetOk || botOk) {
    showToast("Заказ отправлен. Администратор свяжется с вами.");
    Object.keys(cart).forEach(key => delete cart[key]);
    renderCart();
  } else {
    showToast("Не удалось отправить заказ автоматически. Напишите администратору вручную.");
  }
}

async function submitCustomOrder() {
  const title = document.getElementById("custom_title");
  const description = document.getElementById("custom_description");
  const size = document.getElementById("custom_size");
  const qty = document.getElementById("custom_qty");
  const delivery = document.getElementById("custom_delivery");
  const accept = document.getElementById("custom_accept");

  if (!title || !description || !qty || !delivery || !accept) {
    showToast("Ошибка формы. Обновите страницу.");
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

  const telegramUser = getTelegramUser();

  const payload = {
    type: "custom_order",
    created_at: new Date().toISOString(),
    ...telegramUser,
    full_name: `${telegramUser.first_name} ${telegramUser.last_name}`.trim(),
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

  const [sheetOk] = await Promise.all([
    sendToGoogleSheets(payload)
  ]);

  const botOk = sendToTelegramBot(payload);

  if (sheetOk || botOk) {
    showToast("Кастомная заявка отправлена. Администратор свяжется с вами.");
    title.value = "";
    description.value = "";
    size.value = "";
    qty.value = 1;
    delivery.checked = false;
    accept.checked = false;
  } else {
    showToast("Не удалось отправить заявку автоматически. Напишите администратору вручную.");
  }
}

function bindCustomForm() {
  const button = document.getElementById("customSubmitBtn");
  if (!button) return;
  button.addEventListener("click", submitCustomOrder);
}

function init() {
  renderProducts();
  renderCart();
  bindCustomForm();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
