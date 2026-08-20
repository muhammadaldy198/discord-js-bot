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
const {
  EmbedBuilder,
  ApplicationCommandOptionType,
} = require("discord.js");

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

async function robloxFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 DiscordBot/1.0",
      ...(options.headers || {}),
    },
  });

  let data;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

async function getRobloxProfile(username) {
  try {
    if (!username) {
      return "❌ Please provide a Roblox username.";
    }

    // Roblox username lookup
    const search = await robloxFetch(
      "https://users.roblox.com/v1/usernames/users",
      {
        method: "POST",
        body: JSON.stringify({
          usernames: [username],
          excludeBannedUsers: false,
        }),
      }
    );

    console.log(
      `[Roblox] Username: ${username} | Status: ${search.status}`
    );

    // Rate limit / API error
    if (!search.ok) {
      console.error("[Roblox] Lookup failed:", search.data);

      if (search.status === 429) {
        return "⏳ Roblox API sedang rate-limited. Coba lagi beberapa detik.";
      }

      if (search.status === 403) {
        return "🚫 Roblox API menolak request dari server bot.";
      }

      if (search.status >= 500) {
        return "⚠️ Roblox API sedang mengalami gangguan. Coba lagi nanti.";
      }

      return `⚠️ Roblox API error (HTTP ${search.status}).`;
    }

    if (
      !search.data ||
      !Array.isArray(search.data.data) ||
      search.data.data.length === 0
    ) {
      return `❌ Roblox user **${username}** tidak ditemukan.`;
    }

    const user = search.data.data[0];
    const userId = user.id;

    // Get full profile
    const profile = await robloxFetch(
      `https://users.roblox.com/v1/users/${userId}`,
      {
        method: "GET",
      }
    );

    if (!profile.ok || !profile.data) {
      console.error("[Roblox] Profile failed:", profile.status);

      if (profile.status === 429) {
        return "⏳ Roblox API sedang rate-limited. Coba lagi beberapa detik.";
      }

      return `⚠️ Gagal mengambil profile Roblox (HTTP ${profile.status}).`;
    }

    const data = profile.data;

    const avatar =
      `https://www.roblox.com/headshot-thumbnail/image` +
      `?userId=${userId}` +
      `&width=420` +
      `&height=420` +
      `&format=png`;

    const createdTimestamp = data.created
      ? Math.floor(new Date(data.created).getTime() / 1000)
      : null;

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
          value: createdTimestamp
            ? `<t:${createdTimestamp}:D>`
            : "Unknown",
          inline: true,
        },
        {
          name: "🚫 Banned",
          value: data.isBanned ? "Yes" : "No",
          inline: true,
        }
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

    return {
      embeds: [embed],
    };
  } catch (error) {
    console.error("[Roblox] Unexpected error:", error);

    return MESSAGES.API_ERROR || "❌ Failed to fetch Roblox profile.";
  }
}
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
