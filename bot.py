async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (
        "Здравствуйте! Это Paragon Shop.\n\n"
        "Нажмите кнопку ниже, чтобы открыть магазин."
    )
    await update.message.reply_text(text, reply_markup=get_main_keyboard())
