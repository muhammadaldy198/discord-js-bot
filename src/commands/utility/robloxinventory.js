const {
  EmbedBuilder,
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { getJson } = require("@helpers/HttpUtils");
const { EMBED_COLORS } = require("@root/config.js");

module.exports = {
  name: "roblox-inventory",
  description: "View a Roblox user's public inventory",
  category: "UTILITY",

  botPermissions: ["EmbedLinks"],
  cooldown: 5,

  command: {
    enabled: true,
    usage: "<username>",
    minArgsCount: 1,
  },

  slashCommand: {
    enabled: true,
    options: [
      {
        name: "username",
        description: "The Roblox username",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  async messageRun(message, args) {
    const username = args.join(" ").trim();

    if (!username) {
      return message.safeReply("❌ Please provide a Roblox username.");
    }

    return message.safeReply(
      await getInventory(username)
    );
  },

  async interactionRun(interaction) {
    const username = interaction.options
      .getString("username", true)
      .trim();

    return interaction.followUp(
      await getInventory(username)
    );
  },
};

async function getInventory(username) {
  try {
    // Find Roblox user
    const search = await getJson(
      "https://users.roblox.com/v1/usernames/users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          usernames: [username],
          excludeBannedUsers: false,
        }),
      }
    );

    if (
      !search.success ||
      !search.data ||
      !Array.isArray(search.data.data) ||
      search.data.data.length === 0
    ) {
      return `❌ Roblox user **${username}** tidak ditemukan.`;
    }

    const user = search.data.data[0];
    const userId = user.id;

    // Get profile
    const profileResult = await getJson(
      `https://users.roblox.com/v1/users/${userId}`
    );

    if (!profileResult.success || !profileResult.data) {
      return "❌ Gagal mengambil profile Roblox.";
    }

    const profile = profileResult.data;

    // Avatar
    let avatarUrl = null;

    const thumbnailResult = await getJson(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot` +
        `?userIds=${userId}` +
        `&size=720x720` +
        `&format=Png` +
        `&isCircular=false`
    );

    if (
      thumbnailResult.success &&
      thumbnailResult.data &&
      Array.isArray(thumbnailResult.data.data) &&
      thumbnailResult.data.data.length > 0
    ) {
      const thumbnail = thumbnailResult.data.data[0];

      if (thumbnail.state === "Completed") {
        avatarUrl = thumbnail.imageUrl;
      }
    }

    // Check inventory
    const inventoryResult = await getJson(
      `https://inventory.roblox.com/v1/users/${userId}/can-view-inventory`
    );

    const canViewInventory =
      inventoryResult.success &&
      inventoryResult.data &&
      inventoryResult.data.canViewInventory === true;

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.BOT_EMBED)
      .setTitle("◈ Roblox Inventory")
      .setDescription(
        `Public inventory information for **${profile.name}**`
      )
      .setURL(
        `https://www.roblox.com/users/${userId}/profile`
      );

    if (avatarUrl) {
      embed.setImage(avatarUrl);
    }

    embed.addFields(
      {
        name: "👤 Username",
        value: `\`${profile.name}\``,
        inline: true,
      },
      {
        name: "✨ Display Name",
        value: `\`${profile.displayName || profile.name}\``,
        inline: true,
      },
      {
        name: "🆔 User ID",
        value: `\`${userId}\``,
        inline: true,
      },
      {
        name: "🎒 Inventory",
        value: canViewInventory
          ? "🟢 Public"
          : "🔒 Private",
        inline: false,
      }
    );

    if (!canViewInventory) {
      embed.addFields({
        name: "⚠️ Inventory Unavailable",
        value:
          "Inventory user ini bersifat **private**, jadi Roblox tidak mengizinkan bot mengambil itemnya.",
        inline: false,
      });
    } else {
      embed.addFields({
        name: "📦 Items",
        value:
          "Inventory dapat dilihat secara publik. Gunakan tombol **View Inventory** untuk melihat item Roblox.",
        inline: false,
      });
    }

    embed.setFooter({
      text: `Roblox • User ID: ${userId}`,
    });

    embed.setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("View Inventory")
        .setStyle(ButtonStyle.Link)
        .setURL(
          `https://www.roblox.com/users/${userId}/inventory`
        ),
      new ButtonBuilder()
        .setLabel("View Profile")
        .setStyle(ButtonStyle.Link)
        .setURL(
          `https://www.roblox.com/users/${userId}/profile`
        )
    );

    return {
      embeds: [embed],
      components: [row],
    };
  } catch (error) {
    console.error(
      "[ROBLOX INVENTORY] Error:",
      error
    );

    return "❌ Gagal mengambil inventory Roblox.";
  }
}
