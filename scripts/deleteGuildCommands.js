const { REST, Routes } = require("discord.js");

const TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = "1442846959865172000";

if (!TOKEN) {
  console.error("BOT_TOKEN tidak ditemukan di environment.");
  process.exit(1);
}

(async () => {
  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    const app = await rest.get(Routes.oauth2CurrentApplication());

    const commands = await rest.get(
      Routes.applicationGuildCommands(app.id, GUILD_ID)
    );

    console.log(`Ditemukan ${commands.length} guild command.`);

    for (const command of commands) {
      await rest.delete(
        Routes.applicationGuildCommand(
          app.id,
          GUILD_ID,
          command.id
        )
      );

      console.log(`🗑️ Dihapus: /${command.name}`);
    }

    console.log("✅ Semua guild commands dihapus.");
    console.log("🌐 Global commands tidak disentuh.");
  } catch (error) {
    console.error("❌ Gagal menghapus guild commands:");
    console.error(error);
    process.exit(1);
  }
})();
