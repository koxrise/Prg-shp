import json
import logging
from telegram import Update, ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters

BOT_TOKEN = "ВСТАВЬТЕ_СЮДА_ТОКЕН_БОТА"
ADMIN_ID = 8025509315
WEBAPP_URL = "https://koxrise.github.io/Prg-shp/"

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)

def get_main_keyboard():
    keyboard = [
        [KeyboardButton(text="Открыть магазин", web_app=WebAppInfo(url=WEBAPP_URL))]
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (
        "Здравствуйте! Это Paragon Shop.\n\n"
        "Нажмите кнопку ниже, чтобы открыть магазин.\n"
        "Внутри вы сможете добавить товары в корзину, отправить заказ или оставить кастомную заявку."
    )
    await update.message.reply_text(text, reply_markup=get_main_keyboard())

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Нажмите кнопку «Открыть магазин», чтобы перейти в Mini App.",
        reply_markup=get_main_keyboard()
    )

def format_admin_message(data: dict) -> str:
    order_type = data.get("type", "unknown")
    title = "🛒 Новый заказ"

    if order_type == "custom_order":
        title = "🪵 Новая кастомная заявка"

    username = data.get("username", "")
    user_tag = f"@{username}" if username else "(без username)"
    full_name = data.get("full_name") or "Без имени"
    user_id = data.get("user_id", "неизвестно")

    return (
        f"{title}\n\n"
        f"Тип: {order_type}\n"
        f"Дата: {data.get('created_at', '')}\n"
        f"Имя: {full_name}\n"
        f"Username: {user_tag}\n"
        f"User ID: {user_id}\n\n"
        f"Товары / заявка: {data.get('products', '')}\n"
        f"Сумма: {data.get('total', '')}\n"
        f"Доставка: {data.get('delivery', '')}\n"
        f"Ссылка(и) на оплату: {data.get('payment_link', '')}\n"
        f"Комментарий: {data.get('comment', '')}\n"
        f"Статус: {data.get('status', '')}"
    )

async def web_app_data_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    raw_data = update.effective_message.web_app_data.data

    try:
        data = json.loads(raw_data)
    except Exception as e:
        logger.exception("Ошибка чтения web_app_data: %s", e)
        await update.effective_message.reply_text("Не удалось обработать данные заказа.")
        return

    admin_text = format_admin_message(data)

    try:
        await context.bot.send_message(chat_id=ADMIN_ID, text=admin_text)
    except Exception as e:
        logger.exception("Ошибка отправки админу: %s", e)

    order_type = data.get("type", "")

    if order_type == "custom_order":
        reply_text = (
            "✅ Ваша заявка на изготовление под заказ отправлена.\n\n"
            "Администратор свяжется с вами в течение 24 часов, уточнит детали "
            "и предложит варианты реализации."
        )
    else:
        reply_text = (
            "✅ Ваш заказ отправлен администратору.\n\n"
            "После оплаты и оформления с вами свяжутся для уточнения деталей."
        )

    await update.effective_message.reply_text(reply_text, reply_markup=get_main_keyboard())

def main():
    app = Application.builder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, web_app_data_handler))

    app.run_polling()

if __name__ == "__main__":
    main()
