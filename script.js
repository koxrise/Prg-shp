const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const products = [
  {
    id: "dicejail",
    name: "DiceJail",
    price: 1500,
    description: "Тюрьма для самых непослушных дайсов. Исполнена из дерева, все 4 стороны поднимаются вверх. Возможно исполнение в трёх цветах.",
    size: "Размеры: 10 × 10 × 11 см",
    image: "https://i.ibb.co/W4kMscBv/Frame-2.jpg",
    payment_url: "https://yookassa.ru/my/i/ajivKK4ijE__/l",
    contact_url: "https://t.me/cringeator"
  },
  {
    id: "dicetray",
    name: "Дайс трей",
    price: 1500,
    description: "Лоток для кубиков, идеален для настольных игр. Практичный, красивый и удобный аксессуар для игровых вечеров.",
    size: "Размеры: 21 × 21 × 3 см",
    image: "https://i.ibb.co/Mydq6V17/Frame-1.jpg",
    payment_url: "https://yookassa.ru/my/i/ajivPXotscnv/l",
    contact_url: "https://t.me/cringeator"
  }
];

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
  toast.textContent = text;
  toast.classList.remove("hidden");
  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3200);
}

function renderProducts() {
  const container = document.getElementById("products");

  container.innerHTML = products.map(product => `
    <article class="product-card">
      <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
      <div class="product-body">
        <div class="product-title">
          <h3>${escapeHtml(product.name)}</h3>
          <div class="price">${product.price} ₽</div>
        </div>

        <div class="product-desc">${escapeHtml(product.description)}</div>
        <div class="meta">${escapeHtml(product.size)}</div>

        <div class="delivery-box">
          <label class="delivery-top">
            <input type="checkbox" id="delivery_${escapeHtml(product.id)}">
            <span>Нужна доставка</span>
          </label>
          <div class="delivery-note" id="delivery_note_${escapeHtml(product.id)}">
            После оплаты администратор свяжется с вами, уточнит адрес, способ отправки и рассчитает стоимость доставки.
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-primary" onclick="submitOrder('${escapeHtml(product.id)}')">
            Оформить заказ
          </button>

          <a class="btn btn-secondary" href="${escapeHtml(product.payment_url)}" target="_blank" rel="noopener noreferrer">
            Оплатить через ЮMoney
          </a>

          <a class="btn btn-outline" href="${escapeHtml(product.contact_url)}" target="_blank" rel="noopener noreferrer">
            Написать администратору
          </a>
        </div>
      </div>
    </article>
  `).join("");

  products.forEach(product => {
    const checkbox = document.getElementById(`delivery_${product.id}`);
    const note = document.getElementById(`delivery_note_${product.id}`);

    checkbox.addEventListener("change", () => {
      note.classList.toggle("active", checkbox.checked);
    });
  });
}

function submitOrder(productId) {
  const product = products.find(item => item.id === productId);
  if (!product) {
    showToast("Товар не найден.");
    return;
  }

  const delivery = document.getElementById(`delivery_${product.id}`)?.checked ? "yes" : "no";
  const user = tg.initDataUnsafe?.user || {};

  const payload = {
    type: "order",
    product_id: product.id,
    product_name: product.name,
    price: product.price,
    delivery: delivery,
    user_id: user.id || null,
    username: user.username || "",
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    created_at: new Date().toISOString()
  };

  try {
    tg.sendData(JSON.stringify(payload));
  } catch (error) {
    console.error(error);
    showToast("Не удалось отправить заказ в бота. Напишите администратору вручную.");
  }
}

renderProducts();
