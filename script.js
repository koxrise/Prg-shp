const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const YOOMONEY_RECEIVER = "4100XXXXXXXXXXXX";

const products = [
  {
    id: "dicejail",
    name: "DiceJail",
    price: 199,
    description: "Описание товара DiceJail. Коротко и понятно.",
    image: "https://picsum.photos/seed/dicejail/600/600"
  },
  {
    id: "goldguide",
    name: "Gold Guide",
    price: 299,
    description: "Цифровой материал или инструкция.",
    image: "https://picsum.photos/seed/goldguide/600/600"
  },
  {
    id: "vipaccess",
    name: "VIP Access",
    price: 499,
    description: "Доступ к закрытому материалу или услуге.",
    image: "https://picsum.photos/seed/vipaccess/600/600"
  }
];

function buildYooMoneyLink(product) {
  const label = `product_${product.id}_${Date.now()}`;
  const params = new URLSearchParams({
    receiver: YOOMONEY_RECEIVER,
    "quickpay-form": "shop",
    targets: product.name,
    paymentType: "AC",
    sum: product.price,
    label: label
  });

  return `https://yoomoney.ru/quickpay/confirm.xml?${params.toString()}`;
}

function renderProducts() {
  const container = document.getElementById("products");

  container.innerHTML = products.map(product => {
    const payLink = buildYooMoneyLink(product);

    return `
      <article class="card">
        <img src="${product.image}" alt="${product.name}">
        <div class="card-body">
          <h3>${product.name}</h3>
          <div class="price">${product.price} ₽</div>
          <div class="desc">${product.description}</div>
          <div class="actions">
            <a class="btn btn-primary" href="${payLink}" target="_blank" rel="noopener noreferrer">
              Оплатить
            </a>
            <button class="btn btn-secondary" onclick="copyOrderInfo('${product.name}', '${product.id}')">
              Реквизиты
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function copyOrderInfo(productName, productId) {
  const text = `Я оплатил товар ${productName} (${productId}).`;
  navigator.clipboard.writeText(text).then(() => {
    alert("Текст скопирован. Его можно отправить администратору после оплаты.");
  });
}

renderProducts();
