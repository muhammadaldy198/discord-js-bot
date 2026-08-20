const { REST, Routes } = require("discord.js");

const token = process.env.BOT_TOKEN;

if (!token) {
  console.error("BOT_TOKEN tidak ditemukan.");
  process.exit(1);
}

(async () => {
  try {
    const rest = new REST({ version: "10" }).setToken(token);

    const app = await rest.get(Routes.oauth2CurrentApplication());

    await rest.put(
      Routes.applicationCommands(app.id),
      { body: [] }
    );

    console.log("✅ Semua global commands berhasil dihapus.");
    console.log("Guild commands tidak disentuh.");
  } catch (error) {
    console.error("❌ Gagal:", error);
    process.exit(1);
  }
})();
