const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const PermissionManager = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setbotavatar')
        .setDescription('Change the bot\'s avatar (Owner Only)')
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('The new avatar image')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // Check if user is the bot owner
            if (!PermissionManager.isOwner(interaction.user.id)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.error)
                    .setTitle('❌ Permission Denied')
                    .setDescription('This command can only be used by the bot owner.')
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            const attachment = interaction.options.getAttachment('image');

            // Validate file type
            const validTypes = ['image/png', 'image/jpeg', 'image/gif'];
            if (!validTypes.includes(attachment.contentType)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.error)
                    .setTitle('❌ Invalid File Type')
                    .setDescription('Avatar must be a PNG, JPEG, or GIF file.')
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Validate file size (max 10MB)
            if (attachment.size > 10 * 1024 * 1024) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.error)
                    .setTitle('❌ File Too Large')
                    .setDescription('Avatar file must be smaller than 10MB.')
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Create loading embed
            const loadingEmbed = new EmbedBuilder()
                .setColor(config.embedColors.primary)
                .setTitle('🔄 Updating Avatar...')
                .setDescription('Please wait while I update my avatar.')
                .setTimestamp();

            await interaction.editReply({ embeds: [loadingEmbed] });

            // Set the new avatar
            await interaction.client.user.setAvatar(attachment.url);

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor(config.embedColors.success)
                .setTitle('✅ Avatar Updated')
                .setDescription('Bot avatar has been successfully updated.')
                .setThumbnail(attachment.url)
                .addFields({
                    name: 'File Info',
                    value: `Type: ${attachment.contentType}\nSize: ${Math.round(attachment.size / 1024)}KB`,
                    inline: true
                })
                .setFooter({ text: `Updated by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

            // Log the avatar change
            try {
                const logChannel = interaction.guild.channels.cache.find(
                    channel => channel.name === 'bot-logs'
                );

                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(config.embedColors.primary)
                        .setTitle('🔄 Bot Avatar Changed')
                        .setThumbnail(attachment.url)
                        .addFields(
                            {
                                name: 'Changed By',
                                value: interaction.user.toString(),
                                inline: true
                            },
                            {
                                name: 'File Info',
                                value: `Type: ${attachment.contentType}\nSize: ${Math.round(attachment.size / 1024)}KB`,
                                inline: true
                            }
                        )
                        .setFooter({ text: 'Bot avatar change log' })
                        .setTimestamp();

                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (error) {
                console.log('Could not log to bot-logs channel:', error);
            }

        } catch (error) {
            console.error('Error in setbotavatar command:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Command Failed')
                .setDescription(`Failed to update avatar: ${error.message}`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};