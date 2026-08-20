const {
  EmbedBuilder,
  ApplicationCommandOptionType,
} = require("discord.js");

const { EMBED_COLORS, MESSAGES } = require("@root/config.js");
const { getJson } = require("@helpers/HttpUtils.js");

module.exports = {
  name: "roblox",
  description: "Get a Roblox user's profile",
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

    if (!username) {
      return message.safeReply("❌ Please provide a Roblox username.");
    }

    const response = await getRobloxProfile(username);
    return message.safeReply(response);
  },

  async interactionRun(interaction) {
    const username = interaction.options.getString("username", true).trim();

    const response = await getRobloxProfile(username);
    return interaction.followUp(response);
  },
};

async function getRobloxProfile(username) {
  try {
    /*
     * Roblox username lookup
     * POST /v1/usernames/users
     */
    const result = await getJson(
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

    console.log(
      `[ROBLOX] Lookup "${username}" | success=${result.success} status=${result.status}`
    );

    if (!result.success) {
      console.error("[ROBLOX] API error:", result);

      if (result.status === 429) {
        return "⏳ Roblox API sedang rate limit. Coba lagi beberapa detik.";
      }

      return `❌ Roblox API error (HTTP ${result.status || "unknown"}).`;
    }

    /*
     * IMPORTANT:
     *
     * getJson() returns:
     *
     * result.data = Roblox response
     *
     * Roblox response:
     *
     * {
     *   data: [...]
     * }
     *
     * Jadi array user ada di result.data.data
     */
    if (
      !result.data ||
      !Array.isArray(result.data.data) ||
      result.data.data.length === 0
    ) {
      return `❌ Roblox user **${username}** tidak ditemukan.`;
    }

    const user = result.data.data[0];
    const userId = user.id;

    /*
     * Get complete user profile
     */
    const profileResult = await getJson(
      `https://users.roblox.com/v1/users/${userId}`
    );

    if (!profileResult.success || !profileResult.data) {
      console.error("[ROBLOX] Profile API error:", profileResult);

      if (profileResult.status === 429) {
        return "⏳ Roblox API sedang rate limit. Coba lagi beberapa detik.";
      }

      return `❌ Gagal mengambil profile Roblox (HTTP ${
        profileResult.status || "unknown"
      }).`;
    }

    const profile = profileResult.data;

    /*
     * Roblox avatar
     */
    const avatarUrl =
      `https://www.roblox.com/headshot-thumbnail/image` +
      `?userId=${userId}` +
      `&width=420` +
      `&height=420` +
      `&format=png`;

    /*
     * Account creation date
     */
    let created = "Unknown";

    if (profile.created) {
      const timestamp = Math.floor(
        new Date(profile.created).getTime() / 1000
      );

      if (!Number.isNaN(timestamp)) {
        created = `<t:${timestamp}:D>`;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.BOT_EMBED)
      .setTitle(`Roblox Profile — ${profile.displayName || profile.name}`)
      .setURL(`https://www.roblox.com/users/${userId}/profile`)
      .setThumbnail(avatarUrl)
      .addFields(
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
          name: "📅 Created",
          value: created,
          inline: true,
        },
        {
          name: "🚫 Banned",
          value: profile.isBanned ? "Yes" : "No",
          inline: true,
        }
      );

    if (profile.description) {
      const description =
        profile.description.length > 1000
          ? `${profile.description.substring(0, 997)}...`
          : profile.description;

      embed.setDescription(description);
    } else {
      embed.setDescription("No profile description.");
    }

    embed.setFooter({
      text: `Roblox User ID: ${userId}`,
    });

    return {
      embeds: [embed],
    };
  } catch (error) {
    console.error("[ROBLOX] Unexpected error:", error);

    return MESSAGES.API_ERROR || "❌ Failed to fetch Roblox profile.";
  }
}
