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

    if (!username) {
      return message.safeReply("❌ Please provide a Roblox username.");
    }

    const response = await getRobloxProfile(username);
    return message.safeReply(response);
  },

  async interactionRun(interaction) {
    const username = interaction.options
      .getString("username", true)
      .trim();

    const response = await getRobloxProfile(username);
    return interaction.followUp(response);
  },
};

async function getRobloxProfile(username) {
  try {
    /*
     * ==========================================
     * 1. FIND ROBLOX USER
     * ==========================================
     */

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

    console.log(
      `[ROBLOX] Username: ${username} | Success: ${search.success}`
    );

    if (!search.success) {
      console.error("[ROBLOX] Username lookup failed:", search);

      return (
        MESSAGES.API_ERROR ||
        "❌ Roblox API error. Please try again later."
      );
    }

    /*
     * Roblox response is:
     *
     * {
     *   data: [
     *     {
     *       requestedUsername: "...",
     *       hasVerifiedBadge: false,
     *       id: 123456,
     *       name: "...",
     *       displayName: "..."
     *     }
     *   ]
     * }
     *
     * getJson() returns that object inside search.data
     *
     * Therefore the actual array is:
     *
     * search.data.data
     */

    if (
      !search.data ||
      !Array.isArray(search.data.data) ||
      search.data.data.length === 0
    ) {
      return `❌ Roblox user **${username}** not found.`;
    }

    const user = search.data.data[0];
    const userId = user.id;

    /*
     * ==========================================
     * 2. GET FULL PROFILE
     * ==========================================
     */

    const profile = await getJson(
      `https://users.roblox.com/v1/users/${userId}`
    );

    if (!profile.success || !profile.data) {
      console.error("[ROBLOX] Profile lookup failed:", profile);

      return (
        MESSAGES.API_ERROR ||
        "❌ Failed to fetch Roblox profile."
      );
    }

    const data = profile.data;

    /*
     * ==========================================
     * 3. GET ROBLOX AVATAR
     * ==========================================
     *
     * Use Roblox Thumbnails API instead of the
     * old headshot-thumbnail URL.
     */

    let avatarUrl = null;

    const thumbnail = await getJson(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot` +
        `?userIds=${userId}` +
        `&size=420x420` +
        `&format=Png` +
        `&isCircular=false`
    );

    if (
      thumbnail.success &&
      thumbnail.data &&
      Array.isArray(thumbnail.data.data) &&
      thumbnail.data.data.length > 0
    ) {
      const thumbnailData = thumbnail.data.data[0];

      if (thumbnailData.state === "Completed") {
        avatarUrl = thumbnailData.imageUrl;
      }
    }

    /*
     * ==========================================
     * 4. CREATE EMBED
     * ==========================================
     */

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.BOT_EMBED)
      .setTitle(
        `Roblox Profile — ${data.displayName || data.name}`
      )
      .setURL(
        `https://www.roblox.com/users/${userId}/profile`
      );

    /*
     * Add avatar only if Roblox returned one.
     */
    if (avatarUrl) {
      embed.setThumbnail(avatarUrl);
    }

    /*
     * Account creation date
     */
    let created = "Unknown";

    if (data.created) {
      const timestamp = Math.floor(
        new Date(data.created).getTime() / 1000
      );

      if (!Number.isNaN(timestamp)) {
        created = `<t:${timestamp}:D>`;
      }
    }

    embed.addFields(
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
        value: created,
        inline: true,
      },
      {
        name: "🚫 Banned",
        value: data.isBanned ? "Yes" : "No",
        inline: true,
      }
    );

    /*
     * Profile description
     */
    if (data.description) {
      embed.setDescription(
        data.description.length > 1000
          ? `${data.description.slice(0, 997)}...`
          : data.description
      );
    } else {
      embed.setDescription(
        "No Roblox profile description."
      );
    }

    /*
     * Footer
     */
    embed.setFooter({
      text: `Roblox User ID: ${userId}`,
    });

    return {
      embeds: [embed],
    };
  } catch (error) {
    console.error(
      "[ROBLOX] Unexpected error:",
      error
    );

    return "❌ Failed to fetch Roblox profile.";
  }
}
