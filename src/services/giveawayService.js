/**
 * Giveaway Service
 *
 * Central wrapper for the existing discord-giveaways manager.
 * This service does NOT create a new MongoDB connection.
 *
 * Compatible with:
 *   client.giveawaysManager
 *
 * Existing manager:
 *   src/handlers/giveaway.js
 */

class GiveawayService {
  /**
   * @param {import("@structures/BotClient")} client
   */
  constructor(client) {
    if (!client) {
      throw new Error("GiveawayService requires a Discord client.");
    }

    if (!client.giveawaysManager) {
      throw new Error("Giveaway manager is not initialized.");
    }

    this.client = client;
    this.manager = client.giveawaysManager;
  }

  /**
   * Get all giveaways.
   *
   * @returns {Array}
   */
  getAll() {
    return this.manager.giveaways || [];
  }

  /**
   * Get giveaways belonging to a guild.
   *
   * @param {string} guildId
   * @param {boolean} activeOnly
   * @returns {Array}
   */
  getByGuild(guildId, activeOnly = false) {
    if (!guildId) return [];

    return this.getAll().filter((giveaway) => {
      if (giveaway.guildId !== guildId) return false;

      if (activeOnly && giveaway.ended) {
        return false;
      }

      return true;
    });
  }

  /**
   * Find a giveaway by message ID.
   *
   * @param {string} messageId
   * @param {string} [guildId]
   * @returns {object|null}
   */
  getByMessageId(messageId, guildId) {
    if (!messageId) return null;

    return (
      this.getAll().find((giveaway) => {
        if (giveaway.messageId !== messageId) {
          return false;
        }

        if (guildId && giveaway.guildId !== guildId) {
          return false;
        }

        return true;
      }) || null
    );
  }

  /**
   * Start a giveaway.
   *
   * This uses the existing giveawaysManager.start()
   * so the current MongoDB persistence continues to work.
   *
   * @param {import('discord.js').TextChannel} channel
   * @param {import('discord-giveaways').GiveawayStartOptions} options
   * @returns {Promise<object>}
   */
  async create(channel, options) {
    if (!channel) {
      throw new Error("Giveaway channel is required.");
    }

    if (!options || typeof options !== "object") {
      throw new Error("Giveaway options are required.");
    }

    const giveaway = await this.manager.start(channel, options);

    return giveaway;
  }

  /**
   * End a giveaway.
   *
   * @param {string} messageId
   * @returns {Promise<object>}
   */
  async end(messageId) {
    const giveaway = this.getByMessageId(messageId);

    if (!giveaway) {
      throw new Error(`Giveaway not found: ${messageId}`);
    }

    if (giveaway.ended) {
      throw new Error("Giveaway has already ended.");
    }

    await giveaway.end();

    return giveaway;
  }

  /**
   * Reroll a giveaway.
   *
   * @param {string} messageId
   * @returns {Promise<object>}
   */
  async reroll(messageId) {
    const giveaway = this.getByMessageId(messageId);

    if (!giveaway) {
      throw new Error(`Giveaway not found: ${messageId}`);
    }

    if (!giveaway.ended) {
      throw new Error("Giveaway has not ended yet.");
    }

    await giveaway.reroll();

    return giveaway;
  }

  /**
   * Pause a giveaway.
   *
   * @param {string} messageId
   * @returns {Promise<object>}
   */
  async pause(messageId) {
    const giveaway = this.getByMessageId(messageId);

    if (!giveaway) {
      throw new Error(`Giveaway not found: ${messageId}`);
    }

    if (giveaway.ended) {
      throw new Error("Cannot pause an ended giveaway.");
    }

    if (giveaway.pauseOptions?.isPaused) {
      throw new Error("Giveaway is already paused.");
    }

    await giveaway.pause();

    return giveaway;
  }

  /**
   * Resume a giveaway.
   *
   * @param {string} messageId
   * @returns {Promise<object>}
   */
  async resume(messageId) {
    const giveaway = this.getByMessageId(messageId);

    if (!giveaway) {
      throw new Error(`Giveaway not found: ${messageId}`);
    }

    if (giveaway.ended) {
      throw new Error("Cannot resume an ended giveaway.");
    }

    if (!giveaway.pauseOptions?.isPaused) {
      throw new Error("Giveaway is not paused.");
    }

    await giveaway.unpause();

    return giveaway;
  }

  /**
   * Edit a giveaway.
   *
   * Supported by the existing manager:
   * - addTime
   * - newPrize
   * - newWinnerCount
   *
   * @param {string} messageId
   * @param {object} changes
   * @returns {Promise<object>}
   */
  async edit(messageId, changes = {}) {
    const giveaway = this.getByMessageId(messageId);

    if (!giveaway) {
      throw new Error(`Giveaway not found: ${messageId}`);
    }

    if (giveaway.ended) {
      throw new Error("Cannot edit an ended giveaway.");
    }

    const options = {};

    if (typeof changes.addTime === "number") {
      options.addTime = changes.addTime;
    }

    if (typeof changes.newPrize === "string" && changes.newPrize.trim()) {
      options.newPrize = changes.newPrize.trim();
    }

    if (typeof changes.newWinnerCount === "number") {
      if (changes.newWinnerCount < 1) {
        throw new Error("Winner count must be at least 1.");
      }

      options.newWinnerCount = changes.newWinnerCount;
    }

    await this.manager.edit(messageId, options);

    return this.getByMessageId(messageId) || giveaway;
  }

  /**
   * Get active giveaways.
   *
   * @param {string} [guildId]
   * @returns {Array}
   */
  getActive(guildId) {
    return this.getAll().filter((giveaway) => {
      if (guildId && giveaway.guildId !== guildId) {
        return false;
      }

      return giveaway.ended === false;
    });
  }

  /**
   * Get ended giveaways.
   *
   * @param {string} [guildId]
   * @returns {Array}
   */
  getEnded(guildId) {
    return this.getAll().filter((giveaway) => {
      if (guildId && giveaway.guildId !== guildId) {
        return false;
      }

      return giveaway.ended === true;
    });
  }

  /**
   * Get a simple dashboard-friendly summary.
   *
   * @param {string} [guildId]
   * @returns {object}
   */
  getStats(guildId) {
    const giveaways = guildId
      ? this.getByGuild(guildId)
      : this.getAll();

    const active = giveaways.filter((g) => g.ended === false);
    const ended = giveaways.filter((g) => g.ended === true);

    const participants = giveaways.reduce((total, giveaway) => {
      return total + (Array.isArray(giveaway.entries)
        ? giveaway.entries.length
        : 0);
    }, 0);

    return {
      total: giveaways.length,
      active: active.length,
      ended: ended.length,
      participants,
    };
  }
}

/**
 * Creates a GiveawayService for the current bot client.
 *
 * @param {import("@structures/BotClient")} client
 * @returns {GiveawayService}
 */
module.exports = (client) => new GiveawayService(client);
