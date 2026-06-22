from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

BOT_TOKEN = "ВАШ_ТОКЕН"

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("START OK")

app = Application.builder().token(BOT_TOKEN).build()
app.add_handler(CommandHandler("start", start))
app.run_polling()
