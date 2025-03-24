const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const minecraftBot = require('../../utils/minecraftBot');
const db = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Make the bot leave the Minecraft server')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The username of the bot to disconnect')
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

            // Create loading embed
            const loadingEmbed = new EmbedBuilder()
                .setColor(config.embedColors.primary)
                .setTitle('🔄 Disconnecting Bot...')
                .setDescription(`Attempting to disconnect bot "${username}"`)
                .setTimestamp();

            await interaction.editReply({ embeds: [loadingEmbed] });

            // Disconnect the bot
            minecraftBot.removeBot(userId, serverId);

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor(config.embedColors.success)
                .setTitle('✅ Successfully Disconnected')
                .setDescription(`Bot "${username}" has been disconnected from the server`)
                .addFields({
                    name: 'Active Connections',
                    value: `${minecraftBot.getBotCount(userId)}`,
                    inline: true
                })
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in leave command:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Disconnection Failed')
                .setDescription(`Failed to disconnect the bot: ${error.message}`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};