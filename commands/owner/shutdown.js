const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const PermissionManager = require('../../utils/permissions');
const minecraftBot = require('../../utils/minecraftBot');
const db = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shutdown')
        .setDescription('Safely shut down the bot (Owner Only)')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for shutting down')
                .setRequired(false)),

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

            const reason = interaction.options.getString('reason') || 'No reason provided';

            // Create shutdown embed
            const shutdownEmbed = new EmbedBuilder()
                .setColor(config.embedColors.warning)
                .setTitle('🔄 Bot Shutting Down...')
                .setDescription('Starting shutdown sequence...')
                .addFields(
                    {
                        name: 'Initiated By',
                        value: interaction.user.toString(),
                        inline: true
                    },
                    {
                        name: 'Reason',
                        value: reason,
                        inline: true
                    }
                )
                .setFooter({ text: 'Bot shutdown sequence initiated' })
                .setTimestamp();

            await interaction.editReply({ embeds: [shutdownEmbed] });

            // Log the shutdown
            try {
                const logChannel = interaction.guild.channels.cache.find(
                    channel => channel.name === 'bot-logs'
                );

                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(config.embedColors.warning)
                        .setTitle('⚠️ Bot Shutdown Initiated')
                        .addFields(
                            {
                                name: 'Initiated By',
                                value: interaction.user.toString(),
                                inline: true
                            },
                            {
                                name: 'Reason',
                                value: reason,
                                inline: true
                            }
                        )
                        .setFooter({ text: 'Bot shutdown log' })
                        .setTimestamp();

                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (error) {
                console.log('Could not log to bot-logs channel:', error);
            }

            // Update embed to show progress
            const progressEmbed = new EmbedBuilder()
                .setColor(config.embedColors.warning)
                .setTitle('🔄 Shutdown in Progress')
                .setDescription('Performing cleanup tasks...')
                .addFields(
                    {
                        name: 'Status',
                        value: '• Disconnecting Minecraft bots...\n• Closing database connections...\n• Saving final state...',
                        inline: false
                    }
                )
                .setFooter({ text: 'Please wait...' })
                .setTimestamp();

            await interaction.editReply({ embeds: [progressEmbed] });

            // Perform cleanup tasks
            try {
                // Disconnect all Minecraft bots
                minecraftBot.disconnectAll();

                // Close database connections
                if (db.premiumDB) db.premiumDB.close();
                if (db.usersDB) db.usersDB.close();

                // Final success embed
                const finalEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.success)
                    .setTitle('✅ Shutdown Complete')
                    .setDescription('All cleanup tasks completed successfully. Bot is now shutting down.')
                    .addFields(
                        {
                            name: 'Final Status',
                            value: '✅ All Minecraft bots disconnected\n✅ Database connections closed\n✅ Final state saved',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'Goodbye!' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [finalEmbed] });

                // Wait a moment for the message to send
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Exit process
                process.exit(0);

            } catch (error) {
                console.error('Error during shutdown:', error);

                const errorEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.error)
                    .setTitle('❌ Shutdown Error')
                    .setDescription(`An error occurred during shutdown: ${error.message}`)
                    .setFooter({ text: 'Bot may be in an inconsistent state' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Error in shutdown command:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Command Failed')
                .setDescription(`Failed to initiate shutdown: ${error.message}`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};