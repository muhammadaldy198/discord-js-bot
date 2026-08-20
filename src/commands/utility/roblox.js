const {
  EmbedBuilder,
  ApplicationCommandOptionType,
} = require("discord.js");

const { getJson } = require("@helpers/HttpUtils");
const { EMBED_COLORS, MESSAGES } = require("@root/config.js");

module.exports = {
  name: "roblox",
  description: "Get Roblox user profile information",
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
        description: "Roblox username",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  async messageRun(message, args) {
    const username = args.join(" ").trim();
    const response = await getRobloxProfile(username);

    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const username = interaction.options.getString("username", true);
    const response = await getRobloxProfile(username);

    await interaction.followUp(response);
  },
};

async function getRobloxProfile(username) {
  try {
    // Find Roblox user by username
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

    // Get complete profile
    const profile = await getJson(
      `https://users.roblox.com/v1/users/${userId}`
    );

    if (!profile.success || !profile.data) {
      return MESSAGES.API_ERROR;
    }

    const data = profile.data;

    const avatar = `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`;

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.BOT_EMBED)
      .setTitle(`Roblox Profile — ${data.displayName || data.name}`)
      .setURL(`https://www.roblox.com/users/${userId}/profile`)
      .setThumbnail(avatar)
      .addFields(
        {
          name: "👤 Username",
          value: `\`${data.name}\``,
          inline: true,
        },
        {
          name: "✨ Display Name",
          value: `\`${data.displayName || data.name}\``,
          inline: true,
        },
        {
          name: "🆔 User ID",
          value: `\`${userId}\``,
          inline: true,
        },
        {
          name: "📅 Created",
          value: data.created
            ? `<t:${Math.floor(new Date(data.created).getTime() / 1000)}:D>`
            : "Unknown",
          inline: true,
        },
        {
          name: "🚫 Banned",
          value: data.isBanned ? "Yes" : "No",
          inline: true,
        },
      );

    if (data.description) {
      embed.setDescription(
        data.description.length > 1000
          ? `${data.description.slice(0, 997)}...`
          : data.description
      );
    } else {
      embed.setDescription("No Roblox profile description.");
    }

    embed.setFooter({
      text: `Roblox User ID: ${userId}`,
    });

    return { embeds: [embed] };
  } catch (error) {
    console.error("Roblox profile error:", error);
    return "❌ Failed to fetch Roblox profile.";
  }
}
