const { SlashCommandBuilder, EmbedBuilder, ActivityType } = require('discord.js');
const config = require('../../config.json');
const PermissionManager = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setstatus')
        .setDescription('Change the bot\'s status (Owner Only)')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The type of status')
                .setRequired(true)
                .addChoices(
                    { name: 'Playing', value: 'PLAYING' },
                    { name: 'Watching', value: 'WATCHING' },
                    { name: 'Listening', value: 'LISTENING' },
                    { name: 'Competing', value: 'COMPETING' }
                ))
        .addStringOption(option =>
            option.setName('text')
                .setDescription('The status text')
                .setRequired(true)
                .setMaxLength(128)),

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

            const statusType = interaction.options.getString('type');
            const statusText = interaction.options.getString('text');

            // Map status types to ActivityType
            const activityTypes = {
                'PLAYING': ActivityType.Playing,
                'WATCHING': ActivityType.Watching,
                'LISTENING': ActivityType.Listening,
                'COMPETING': ActivityType.Competing
            };

            // Set the new status
            await interaction.client.user.setActivity(statusText, {
                type: activityTypes[statusType]
            });

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor(config.embedColors.success)
                .setTitle('✅ Status Updated')
                .setDescription('Bot status has been successfully updated.')
                .addFields(
                    {
                        name: 'Type',
                        value: statusType,
                        inline: true
                    },
                    {
                        name: 'Text',
                        value: statusText,
                        inline: true
                    }
                )
                .setFooter({ text: `Updated by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

            // Log the status change
            try {
                const logChannel = interaction.guild.channels.cache.find(
                    channel => channel.name === 'bot-logs'
                );

                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(config.embedColors.primary)
                        .setTitle('🔄 Bot Status Changed')
                        .addFields(
                            {
                                name: 'Changed By',
                                value: interaction.user.toString(),
                                inline: true
                            },
                            {
                                name: 'New Status',
                                value: `${statusType}: ${statusText}`,
                                inline: true
                            }
                        )
                        .setFooter({ text: 'Bot status change log' })
                        .setTimestamp();

                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (error) {
                console.log('Could not log to bot-logs channel:', error);
            }

        } catch (error) {
            console.error('Error in setstatus command:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Command Failed')
                .setDescription(`Failed to update status: ${error.message}`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};