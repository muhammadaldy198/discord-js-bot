const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require("discord.js");

const { getSettings } = require("@schemas/Guild");

/**
 * Parse welcome variables
 */
const parse = async (content, member, inviterData = {}) => {
  const inviteData = {};

  const getEffectiveInvites = (data = {}) =>
    (data.tracked || 0) +
    (data.added || 0) -
    (data.fake || 0) -
    (data.left || 0);

  if (!content) return "";

  if (content.includes("{inviter:")) {
    const inviterId = inviterData.member_id || "NA";

    if (inviterId !== "VANITY" && inviterId !== "NA") {
      try {
        const inviter = await member.client.users.fetch(inviterId);

        inviteData.name = inviter.username;
        inviteData.tag = inviter.tag;
      } catch (ex) {
        member.client.logger.error(
          `Parsing inviterId: ${inviterId}`,
          ex
        );

        inviteData.name = "NA";
        inviteData.tag = "NA";
      }
    } else if (member.user.bot) {
      inviteData.name = "OAuth";
      inviteData.tag = "OAuth";
    } else {
      inviteData.name = inviterId;
      inviteData.tag = inviterId;
    }
  }

  return content
    .replaceAll(/\\n/g, "\n")
    .replaceAll(/{server}/g, member.guild.name)
    .replaceAll(/{count}/g, String(member.guild.memberCount))
    .replaceAll(/{member:nick}/g, member.displayName)
    .replaceAll(/{member:name}/g, member.user.username)
    .replaceAll(/{member:dis}/g, member.user.discriminator)
    .replaceAll(/{member:tag}/g, member.user.tag)
    .replaceAll(/{member:mention}/g, member.toString())
    .replaceAll(
      /{member:avatar}/g,
      member.user.displayAvatarURL({
        extension: "png",
        size: 512,
      })
    )
    .replaceAll(/{inviter:name}/g, inviteData.name || "NA")
    .replaceAll(/{inviter:tag}/g, inviteData.tag || "NA")
    .replaceAll(
      /{invites}/g,
      String(getEffectiveInvites(inviterData.invite_data))
    );
};

/**
 * Build Welcome / Farewell card
 */
const buildGreeting = async (
  member,
  type,
  config,
  inviterData = {}
) => {
  if (!config) return;

  const embed = config.embed || {};

  // ==============================
  // DESCRIPTION
  // ==============================

  let description;

  if (embed.description) {
    description = await parse(
      embed.description,
      member,
      inviterData
    );
  } else {
    description =
      type === "WELCOME"
        ? `Welcome to the server, ${member.displayName} 🎉`
        : `${member.user.username} has left the server 👋`;
  }

  // ==============================
  // FOOTER
  // ==============================

  const footer = embed.footer
    ? await parse(embed.footer, member, inviterData)
    : "©2026 LFAMILIA";

  // ==============================
  // CONTAINER
  // ==============================

  const container = new ContainerBuilder();

  // Accent color
  if (embed.color) {
    const color = String(embed.color).replace("#", "");
    const colorNumber = parseInt(color, 16);

    if (!Number.isNaN(colorNumber)) {
      container.setAccentColor(colorNumber);
    }
  }

  // ==============================
  // BANNER
  // ==============================

  if (embed.image) {
    const bannerURL = await parse(
      embed.image,
      member,
      inviterData
    );

    if (bannerURL) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder()
            .setURL(bannerURL)
            .setDescription("Welcome banner")
        )
      );
    }
  }

  // ==============================
  // GARIS DI BAWAH BANNER
  // ==============================

  container.addSeparatorComponents(
    new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(1)
  );

  // ==============================
  // DESCRIPTION + AVATAR
  // ==============================

  const contentSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(description)
    )
    .setThumbnailAccessory(
      new ThumbnailBuilder()
        .setURL(
          member.user.displayAvatarURL({
            extension: "png",
            size: 256,
          })
        )
        .setDescription(
          `${member.user.username}'s avatar`
        )
    );

  container.addSectionComponents(contentSection);

  // ==============================
  // GARIS SEBELUM FOOTER
  // ==============================

  container.addSeparatorComponents(
    new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(1)
  );

  // ==============================
  // FOOTER
  // ==============================

  container.addTextDisplayComponents(
    new TextDisplayBuilder()
      .setContent(`-# ${footer}`)
  );

  // ==============================
  // COMPONENTS V2
  // ==============================

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  };
};

/**
 * Send welcome message
 */
async function sendWelcome(
  member,
  inviterData = {}
) {
  const config =
    (await getSettings(member.guild))?.welcome;

  if (!config || !config.enabled) return;

  const channel =
    member.guild.channels.cache.get(
      config.channel
    );

  if (!channel) return;

  const response = await buildGreeting(
    member,
    "WELCOME",
    config,
    inviterData
  );

  if (!response) return;

  await channel.safeSend(response);
}

/**
 * Send farewell message
 */
async function sendFarewell(
  member,
  inviterData = {}
) {
  const config =
    (await getSettings(member.guild))?.farewell;

  if (!config || !config.enabled) return;

  const channel =
    member.guild.channels.cache.get(
      config.channel
    );

  if (!channel) return;

  const response = await buildGreeting(
    member,
    "FAREWELL",
    config,
    inviterData
  );

  if (!response) return;

  await channel.safeSend(response);
}

module.exports = {
  parse,
  buildGreeting,
  sendWelcome,
  sendFarewell,
};
