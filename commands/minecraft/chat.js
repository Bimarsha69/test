const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const minecraftBot = require('../../utils/minecraftBot');
const db = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chat')
        .setDescription('Send a chat message through the Minecraft bot')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The username of the bot to send the message')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to send')
                .setRequired(true)
                .setMaxLength(256)), // Most Minecraft servers have a chat limit

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const userId = interaction.user.id;
            const serverId = interaction.guild.id;
            const username = interaction.options.getString('username');
            const message = interaction.options.getString('message');

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
                .setTitle('🔄 Sending Message...')
                .setDescription('Attempting to send your message to the Minecraft server')
                .addFields(
                    { name: 'Bot Username', value: username, inline: true },
                    { name: 'Message', value: `\`${message}\``, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [loadingEmbed] });

            // Send the chat message
            await minecraftBot.sendChat(userId, serverId, message);

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor(config.embedColors.success)
                .setTitle('✅ Message Sent')
                .setDescription('Your message was successfully sent to the Minecraft server')
                .addFields(
                    { name: 'Bot Username', value: username, inline: true },
                    { name: 'Server', value: userSettings.server_ip, inline: true },
                    { name: 'Message', value: `\`${message}\``, inline: false }
                )
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in chat command:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Message Failed')
                .setDescription(`Failed to send message: ${error.message}`)
                .addFields(
                    { name: 'Bot Username', value: interaction.options.getString('username'), inline: true },
                    { name: 'Message', value: `\`${interaction.options.getString('message')}\``, inline: true }
                )
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};