const { REST, Routes } = require("discord.js");

const TOKEN = process.env.BOT_TOKEN;

if (!TOKEN) {
  console.error("BOT_TOKEN tidak ditemukan.");
  process.exit(1);
}

(async () => {
  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    const app = await rest.get(Routes.oauth2CurrentApplication());

    const commands = await rest.get(
      Routes.applicationCommands(app.id)
    );

    console.log(`Ditemukan ${commands.length} global commands.`);

    await rest.put(
      Routes.applicationCommands(app.id),
      { body: [] }
    );

    console.log("✅ Semua global commands berhasil dihapus.");
    console.log("✅ Guild commands tidak disentuh.");
  } catch (error) {
    console.error("❌ Gagal menghapus global commands:");
    console.error(error);
    process.exit(1);
  }
})();
