const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const minecraftBot = require('../../utils/minecraftBot');
const db = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverstatus')
        .setDescription('Check the status of the Minecraft server')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The username of the bot to check server status')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const userId = interaction.user.id;
            const serverId = interaction.guild.id;
            const username = interaction.options.getString('username');

            // Get user settings
            const userSettings = await db.getUserSettings(userId);

            // Verify bot ownership
            if (!userSettings || userSettings.minecraft_username !== username) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.error)
                    .setTitle('❌ Bot Not Found')
                    .setDescription(`You don't have a bot running with the username "${username}"`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Get server status
            const status = await minecraftBot.getServerStatus(userId, serverId);
            const players = await minecraftBot.getPlayers(userId, serverId);

            // Create status embed
            const statusEmbed = new EmbedBuilder()
                .setColor(config.embedColors.primary)
                .setTitle('🖥️ Server Status')
                .setDescription(`Status for ${userSettings.server_ip}`)
                .addFields(
                    {
                        name: '👥 Players',
                        value: `${players.length}/${status.maxPlayers}`,
                        inline: true
                    },
                    {
                        name: '🎮 Game Mode',
                        value: status.gameMode || 'Unknown',
                        inline: true
                    },
                    {
                        name: '⚔️ Difficulty',
                        value: status.difficulty || 'Unknown',
                        inline: true
                    },
                    {
                        name: '📦 Version',
                        value: status.version || 'Unknown',
                        inline: true
                    },
                    {
                        name: '📡 Latency',
                        value: `${status.ping}ms`,
                        inline: true
                    },
                    {
                        name: '🤖 Bot Username',
                        value: username,
                        inline: true
                    }
                )
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            // Add online players if any
            if (players.length > 0) {
                const playerList = players
                    .map(p => `${p.username} (${p.ping}ms)`)
                    .join('\n')
                    .substring(0, 1024); // Discord field value limit

                statusEmbed.addFields({
                    name: '📋 Online Players',
                    value: playerList,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [statusEmbed] });

        } catch (error) {
            console.error('Error in serverstatus command:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Status Check Failed')
                .setDescription(`Failed to get server status: ${error.message}`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};