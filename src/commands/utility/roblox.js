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
  name: "roblox",
  description: "View a Roblox user's profile",
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
        description: "The Roblox username to look up",
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

/**
 * Get Roblox profile
 */
async function getRobloxProfile(username) {
  try {
    // ==========================================
    // 1. FIND USER BY USERNAME
    // ==========================================

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
      `[ROBLOX] Lookup "${username}" | success=${search.success} | status=${search.status}`
    );

    if (!search.success) {
      console.error("[ROBLOX] Username lookup failed:", search);

      if (search.status === 429) {
        return "⏳ Roblox API sedang rate limit. Coba lagi beberapa detik.";
      }

      return `❌ Roblox API error (HTTP ${
        search.status || "unknown"
      }).`;
    }

    // Roblox response:
    //
    // {
    //   data: [
    //     {
    //       id: 123,
    //       name: "username",
    //       displayName: "DisplayName"
    //     }
    //   ]
    // }
    //
    // Karena getJson() membungkus response,
    // array berada di search.data.data.

    if (
      !search.data ||
      !Array.isArray(search.data.data) ||
      search.data.data.length === 0
    ) {
      return `❌ Roblox user **${username}** tidak ditemukan.`;
    }

    const user = search.data.data[0];
    const userId = user.id;

    // ==========================================
    // 2. GET FULL USER PROFILE
    // ==========================================

    const profileResult = await getJson(
      `https://users.roblox.com/v1/users/${userId}`
    );

    if (!profileResult.success || !profileResult.data) {
      console.error(
        "[ROBLOX] Profile lookup failed:",
        profileResult
      );

      if (profileResult.status === 429) {
        return "⏳ Roblox API sedang rate limit. Coba lagi beberapa detik.";
      }

      return `❌ Gagal mengambil profile Roblox (HTTP ${
        profileResult.status || "unknown"
      }).`;
    }

    const profile = profileResult.data;

    // ==========================================
    // 3. GET LARGE AVATAR
    // ==========================================

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

    // ==========================================
    // 4. ACCOUNT AGE
    // ==========================================

    let createdDate = null;
    let accountAge = "Unknown";

    if (profile.created) {
      createdDate = new Date(profile.created);

      if (!Number.isNaN(createdDate.getTime())) {
        accountAge = calculateAccountAge(createdDate);
      }
    }

    // ==========================================
    // 5. ACCOUNT STATUS
    // ==========================================

    const bannedStatus = profile.isBanned
      ? "🔴 Banned"
      : "🟢 Not Banned";

    const accountStatus = profile.isBanned
      ? "🔴 Banned"
      : "🟢 Active";

    // ==========================================
    // 6. CREATE EMBED
    // ==========================================

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.BOT_EMBED)
      .setTitle("◈ Roblox Profile")
      .setDescription(
        `Profile information for **${profile.name}**`
      )
      .setURL(
        `https://www.roblox.com/users/${userId}/profile`
      );

    // Large avatar
    if (avatarUrl) {
      embed.setImage(avatarUrl);
    }

    // ==========================================
    // PROFILE INFORMATION
    // ==========================================

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
        name: "📅 Account Age",
        value: createdDate
          ? `${accountAge}\nCreated <t:${Math.floor(
              createdDate.getTime() / 1000
            )}:R>`
          : "Unknown",
        inline: true,
      },
      {
        name: "🚩 Account Status",
        value: accountStatus,
        inline: true,
      },
      {
        name: "🛡️ Banned Status",
        value: bannedStatus,
        inline: true,
      }
    );

    // ==========================================
    // ABOUT
    // ==========================================

    const description = profile.description?.trim();

    embed.addFields({
      name: "💬 About",
      value: description
        ? description.length > 1024
          ? `${description.slice(0, 1021)}...`
          : description
        : "No Roblox profile description.",
      inline: false,
    });

    // ==========================================
    // FOOTER
    // ==========================================

    embed.setFooter({
      text: `Roblox • User ID: ${userId}`,
    });

    embed.setTimestamp();

    // ==========================================
    // VIEW PROFILE BUTTON
    // ==========================================

    const row = new ActionRowBuilder().addComponents(
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
    console.error("[ROBLOX] Unexpected error:", error);

    return "❌ Terjadi kesalahan saat mengambil data Roblox.";
  }
}

/**
 * Calculate account age
 */
function calculateAccountAge(createdDate) {
  const now = new Date();

  let years = now.getFullYear() - createdDate.getFullYear();
  let months = now.getMonth() - createdDate.getMonth();
  let days = now.getDate() - createdDate.getDate();

  if (days < 0) {
    months--;

    const previousMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0
    );

    days += previousMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const parts = [];

  if (years > 0) {
    parts.push(`${years} year${years !== 1 ? "s" : ""}`);
  }

  if (months > 0) {
    parts.push(`${months} month${months !== 1 ? "s" : ""}`);
  }

  if (days > 0 || parts.length === 0) {
    parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  }

  return parts.join(", ");
}
