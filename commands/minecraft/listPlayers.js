const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const minecraftBot = require('../../utils/minecraftBot');
const db = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listplayers')
        .setDescription('Show a list of online players on the Minecraft server')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The username of the bot to check players')
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

            // Get online players
            const players = await minecraftBot.getPlayers(userId, serverId);

            // Sort players by name
            players.sort((a, b) => a.username.localeCompare(b.username));

            // Group players by gamemode
            const playersByGamemode = players.reduce((acc, player) => {
                const gamemode = player.gamemode || 'unknown';
                if (!acc[gamemode]) acc[gamemode] = [];
                acc[gamemode].push(player);
                return acc;
            }, {});

            // Create embed
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.primary)
                .setTitle('👥 Online Players')
                .setDescription(`Server: ${userSettings.server_ip}\nTotal Players: ${players.length}`)
                .setTimestamp();

            // Add fields for each gamemode
            for (const [gamemode, gamePlayers] of Object.entries(playersByGamemode)) {
                const playerList = gamePlayers
                    .map(p => `${p.username} (${p.ping}ms)`)
                    .join('\n');

                embed.addFields({
                    name: `${gamemode.charAt(0).toUpperCase() + gamemode.slice(1)} (${gamePlayers.length})`,
                    value: playerList || 'None',
                    inline: false
                });
            }

            // Add footer
            embed.setFooter({ 
                text: `Requested by ${interaction.user.tag} | Bot: ${username}` 
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in listplayers command:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Failed to Get Players')
                .setDescription(`Failed to get player list: ${error.message}`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};