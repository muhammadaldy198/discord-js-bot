const {
  EmbedBuilder,
  ApplicationCommandOptionType,
} = require("discord.js");

const { getJson } = require("@helpers/HttpUtils");
const { EMBED_COLORS } = require("@root/config.js");

module.exports = {
  name: "robloxinventory",
  description: "View a Roblox user's inventory",
  category: "UTILITY",

  botPermissions: ["EmbedLinks"],
  cooldown: 8,

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
        description: "Roblox username",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  async messageRun(message, args) {
    const username = args.join(" ").trim();
    const response = await getRobloxInventory(username);

    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const username = interaction.options.getString("username", true);
    const response = await getRobloxInventory(username);

    await interaction.followUp(response);
  },
};

async function getRobloxInventory(username) {
  try {
    // Find Roblox user
    const search = await getJson(
      `https://users.roblox.com/v1/usernames/users`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usernames: [username],
          excludeBannedUsers: false,
        }),
      }
    );

    if (!search.success || !search.data || !search.data.length) {
      return "❌ Roblox user not found.";
    }

    const user = search.data[0];
    const userId = user.id;

    // Roblox inventory endpoint
    const inventory = await getJson(
      `https://inventory.roblox.com/v1/users/${userId}/items/Asset?sortOrder=Desc&limit=100`
    );

    if (!inventory.success) {
      return "❌ Unable to access this Roblox inventory. The inventory may be private.";
    }

    const items = inventory.data || [];

    if (!items.length) {
      return `📦 **${user.name}** has no publicly visible inventory items.`;
    }

    const displayed = items.slice(0, 15);

    const itemList = displayed
      .map((item, index) => {
        const name = item.name || "Unknown Item";
        const assetId = item.id || "Unknown";

        return `**${index + 1}.** ${name}\n> ID: \`${assetId}\``;
      })
      .join("\n\n");

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.BOT_EMBED)
      .setTitle(`Roblox Inventory — ${user.name}`)
      .setURL(`https://www.roblox.com/users/${userId}/profile`)
      .setDescription(itemList)
      .addFields({
        name: "📦 Items Shown",
        value: `${displayed.length} / ${items.length}`,
        inline: true,
      })
      .setFooter({
        text: `Roblox User ID: ${userId}`,
      });

    return { embeds: [embed] };
  } catch (error) {
    console.error("Roblox inventory error:", error);

    return (
      "❌ Failed to fetch Roblox inventory.\n" +
      "The inventory may be private or Roblox may be rate-limiting the request."
    );
  }
  }
