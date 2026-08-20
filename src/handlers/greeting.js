const {
  EmbedBuilder,
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
 * @param {string} content
 * @param {import('discord.js').GuildMember} member
 * @param {Object} inviterData
 */
const parse = async (content, member, inviterData = {}) => {
  const inviteData = {};

  const getEffectiveInvites = (inviteData = {}) =>
    inviteData.tracked + inviteData.added - inviteData.fake - inviteData.left || 0;

  if (content.includes("{inviter:")) {
    const inviterId = inviterData.member_id || "NA";
    if (inviterId !== "VANITY" && inviterId !== "NA") {
      try {
        const inviter = await member.client.users.fetch(inviterId);
        inviteData.name = inviter.username;
        inviteData.tag = inviter.tag;
      } catch (ex) {
        member.client.logger.error(`Parsing inviterId: ${inviterId}`, ex);
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
    .replaceAll(/{count}/g, member.guild.memberCount)
    .replaceAll(/{member:nick}/g, member.displayName)
    .replaceAll(/{member:name}/g, member.user.username)
    .replaceAll(/{member:dis}/g, member.user.discriminator)
    .replaceAll(/{member:tag}/g, member.user.tag)
    .replaceAll(/{member:mention}/g, member.toString())
    .replaceAll(/{member:avatar}/g, member.displayAvatarURL())
    .replaceAll(/{inviter:name}/g, inviteData.name)
    .replaceAll(/{inviter:tag}/g, inviteData.tag)
    .replaceAll(/{invites}/g, getEffectiveInvites(inviterData.invite_data));
};

/**
 * @param {import('discord.js').GuildMember} member
 * @param {"WELCOME"|"FAREWELL"} type
 * @param {Object} config
 * @param {Object} inviterData
 */
const buildGreeting = async (member, type, config, inviterData = {}) => {
  if (!config) return;

  const embed = config.embed || {};

  // ==============================
  // TITLE
  // ==============================
  const title = `Welcome to ${member.guild.name}`;

  // ==============================
  // DESCRIPTION
  // ==============================
  const description = embed.description
    ? await parse(embed.description, member, inviterData)
    : `Hey ${member}, thanks for joining us!`;

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

  // Warna accent dari setting
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
      const banner = new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder()
          .setURL(bannerURL)
          .setDescription("Welcome banner")
      );

      container.addMediaGalleryComponents(banner);
    }
  }

  // ==============================
  // GARIS TIPIS DI BAWAH BANNER
  // ==============================
  container.addSeparatorComponents(
    new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(1)
  );

  // ==============================
  // TITLE + AVATAR
  // ==============================
  const titleSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(`## ${title}`)
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

  container.addSectionComponents(titleSection);

  // ==============================
  // DESCRIPTION
  // ==============================
  container.addTextDisplayComponents(
    new TextDisplayBuilder()
      .setContent(description)
  );

  // ==============================
  // GARIS TIPIS SEBELUM FOOTER
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
  // COMPONENTS V2 MESSAGE
  // ==============================
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  };
};

/**
 * Send welcome message
 * @param {import('discord.js').GuildMember} member
 * @param {Object} inviterData
 */
async function sendWelcome(member, inviterData = {}) {
  const config = (await getSettings(member.guild))?.welcome;
  if (!config || !config.enabled) return;

  // check if channel exists
  const channel = member.guild.channels.cache.get(config.channel);
  if (!channel) return;

  // build welcome message
  const response = await buildGreeting(member, "WELCOME", config, inviterData);

  channel.safeSend(response);
}

/**
 * Send farewell message
 * @param {import('discord.js').GuildMember} member
 * @param {Object} inviterData
 */
async function sendFarewell(member, inviterData = {}) {
  const config = (await getSettings(member.guild))?.farewell;
  if (!config || !config.enabled) return;

  // check if channel exists
  const channel = member.guild.channels.cache.get(config.channel);
  if (!channel) return;

  // build farewell message
  const response = await buildGreeting(member, "FAREWELL", config, inviterData);

  channel.safeSend(response);
}

module.exports = {
  buildGreeting,
  sendWelcome,
  sendFarewell,
};
