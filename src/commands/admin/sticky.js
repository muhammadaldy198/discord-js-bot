const { ApplicationCommandOptionType } = require("discord.js");
const Sticky = require("@schemas/Sticky");
const { stickyHandler } = require("@src/handlers");

module.exports = {
  name: "sticky",
  description: "Manage sticky message",
  category: "ADMIN",
  userPermissions: ["ManageMessages"],
  botPermissions: ["ManageMessages"],

  command: {
    enabled: true,
    usage: "<set|remove|show> [message]",
    minArgsCount: 1,
  },

  slashCommand: {
    enabled: true,
    ephemeral: true,
    options: [
      {
        name: "action",
        description: "Sticky action",
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: "Set", value: "set" },
          { name: "Remove", value: "remove" },
          { name: "Show", value: "show" },
        ],
      },
      {
        name: "message",
        description: "Sticky message",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },

  async messageRun(message, args) {
    const action = args.shift()?.toLowerCase();

    if (action === "set") {
      const content = args.join(" ");

      if (!content)
        return message.safeReply("Masukkan pesan sticky.");

      let sticky = await Sticky.findOne({
        guildId: message.guildId,
        channelId: message.channelId,
      });

      if (!sticky) {
        sticky = new Sticky({
          guildId: message.guildId,
          channelId: message.channelId,
          createdBy: message.author.id,
        });
      }

      sticky.content = content;
      sticky.messageId = null;
      await sticky.save();

      await stickyHandler.sendSticky(message.channel, sticky);
      return;
    }

    if (action === "remove") {
      const sticky = await Sticky.findOneAndDelete({
        guildId: message.guildId,
        channelId: message.channelId,
      });

      if (!sticky)
        return message.safeReply("Tidak ada sticky di channel ini.");

      if (sticky.messageId) {
        const old = await message.channel.messages
          .fetch(sticky.messageId)
          .catch(() => null);

        if (old) await old.delete().catch(() => {});
      }

      return message.safeReply("Sticky berhasil dihapus.");
    }

    if (action === "show") {
      const sticky = await Sticky.findOne({
        guildId: message.guildId,
        channelId: message.channelId,
      });

      return message.safeReply(
        sticky
          ? `**Sticky:**\n${sticky.content}`
          : "Tidak ada sticky di channel ini."
      );
    }

    return message.safeReply(
      "Gunakan: `sticky set <pesan>`, `sticky remove`, atau `sticky show`"
    );
  },

  async interactionRun(interaction) {
    const action = interaction.options.getString("action");
    const content = interaction.options.getString("message");

    if (action === "set") {
      if (!content)
        return interaction.followUp("Masukkan pesan sticky.");

      let sticky = await Sticky.findOne({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
      });

      if (!sticky) {
        sticky = new Sticky({
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          createdBy: interaction.user.id,
        });
      }

      sticky.content = content;
      sticky.messageId = null;
      await sticky.save();

      await stickyHandler.sendSticky(interaction.channel, sticky);
      return interaction.followUp("Sticky berhasil dibuat.");
    }

    if (action === "remove") {
      const sticky = await Sticky.findOneAndDelete({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
      });

      if (!sticky)
        return interaction.followUp("Tidak ada sticky di channel ini.");

      if (sticky.messageId) {
        const old = await interaction.channel.messages
          .fetch(sticky.messageId)
          .catch(() => null);

        if (old) await old.delete().catch(() => {});
      }

      return interaction.followUp("Sticky berhasil dihapus.");
    }

    if (action === "show") {
      const sticky = await Sticky.findOne({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
      });

      return interaction.followUp(
        sticky
          ? `**Sticky:**\n${sticky.content}`
          : "Tidak ada sticky di channel ini."
      );
    }
  },
};
