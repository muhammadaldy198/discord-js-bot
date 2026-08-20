const Sticky = require("@schemas/Sticky");

async function handleMessage(message) {
  if (!message.guild || message.author.bot) return;

  const sticky = await Sticky.findOne({
    guildId: message.guildId,
    channelId: message.channelId,
  });

  if (!sticky) return;

  if (sticky.messageId) {
    const oldMessage = await message.channel.messages
      .fetch(sticky.messageId)
      .catch(() => null);

    if (oldMessage) await oldMessage.delete().catch(() => {});
  }

  const newMessage = await message.channel.send(sticky.content);

  sticky.messageId = newMessage.id;
  await sticky.save();
}

async function sendSticky(channel, sticky) {
  const newMessage = await channel.send(sticky.content);

  sticky.messageId = newMessage.id;
  await sticky.save();

  return newMessage;
}

module.exports = {
  handleMessage,
  sendSticky,
};
