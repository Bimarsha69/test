const mineflayer = require('mineflayer');
const config = require('../config.json');

class MinecraftBotManager {
    constructor() {
        this.bots = new Map(); // userId_serverId -> bot instance
        this.activeConnections = new Map(); // userId -> number of active connections
    }

    async createBot(userId, serverId, options) {
        const botKey = `${userId}_${serverId}`;
        
        // Check if bot already exists
        if (this.bots.has(botKey)) {
            throw new Error('Bot already exists for this user on this server');
        }

        // Validate version
        if (options.version && !config.supportedVersions.includes(options.version)) {
            throw new Error(`Unsupported Minecraft version. Supported versions: ${config.supportedVersions.join(', ')}`);
        }

        // Create bot options
        const botOptions = {
            host: options.ip,
            port: options.port || 25565,
            username: options.username || config.defaultMinecraftUsername,
            version: options.version || '1.20.2', // Default to latest supported version
            auth: 'offline',
            hideErrors: false
        };

        // Create new bot instance
        const bot = mineflayer.createBot(botOptions);

        // Set up event handlers
        bot.on('spawn', () => {
            console.log(`Bot ${botOptions.username} spawned on ${botOptions.host}:${botOptions.port}`);
        });

        bot.on('error', (err) => {
            console.error(`Bot error for ${botOptions.username}:`, err);
            this.removeBot(userId, serverId);
        });

        bot.on('kicked', (reason) => {
            console.log(`Bot ${botOptions.username} was kicked:`, reason);
            this.removeBot(userId, serverId);
        });

        bot.on('end', () => {
            console.log(`Bot ${botOptions.username} ended connection`);
            this.removeBot(userId, serverId);
        });

        // Store bot instance
        this.bots.set(botKey, {
            instance: bot,
            options: botOptions,
            createdAt: Date.now()
        });

        // Update active connections count
        const currentConnections = this.activeConnections.get(userId) || 0;
        this.activeConnections.set(userId, currentConnections + 1);

        return bot;
    }

    removeBot(userId, serverId) {
        const botKey = `${userId}_${serverId}`;
        const bot = this.bots.get(botKey);

        if (bot) {
            try {
                bot.instance.quit();
            } catch (err) {
                console.error('Error while quitting bot:', err);
            }

            this.bots.delete(botKey);

            // Update active connections count
            const currentConnections = this.activeConnections.get(userId) || 1;
            if (currentConnections <= 1) {
                this.activeConnections.delete(userId);
            } else {
                this.activeConnections.set(userId, currentConnections - 1);
            }
        }
    }

    getBot(userId, serverId) {
        const botKey = `${userId}_${serverId}`;
        const bot = this.bots.get(botKey);
        return bot ? bot.instance : null;
    }

    getBotCount(userId) {
        return this.activeConnections.get(userId) || 0;
    }

    async sendChat(userId, serverId, message) {
        const bot = this.getBot(userId, serverId);
        if (!bot) {
            throw new Error('Bot not found');
        }
        await bot.chat(message);
    }

    async getPlayers(userId, serverId) {
        const bot = this.getBot(userId, serverId);
        if (!bot) {
            throw new Error('Bot not found');
        }
        return Object.keys(bot.players).map(username => ({
            username,
            ping: bot.players[username].ping,
            gamemode: bot.players[username].gamemode
        }));
    }

    async getServerStatus(userId, serverId) {
        const bot = this.getBot(userId, serverId);
        if (!bot) {
            throw new Error('Bot not found');
        }

        return {
            players: Object.keys(bot.players).length,
            maxPlayers: bot.game.maxPlayers,
            gameMode: bot.game.gameMode,
            difficulty: bot.game.difficulty,
            version: bot.version,
            ping: bot.player.ping
        };
    }

    disconnectAll() {
        for (const [botKey, bot] of this.bots) {
            try {
                bot.instance.quit();
            } catch (err) {
                console.error(`Error disconnecting bot ${botKey}:`, err);
            }
        }
        this.bots.clear();
        this.activeConnections.clear();
    }
}

module.exports = new MinecraftBotManager();