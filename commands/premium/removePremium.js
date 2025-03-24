const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');
const PermissionManager = require('../../utils/permissions');
const db = require('../../utils/database');
const minecraftBot = require('../../utils/minecraftBot');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removepremium')
        .setDescription('Remove premium status from a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to remove premium from')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for removing premium status')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            // Check if user has permission to use this command
            if (!await PermissionManager.isAdmin(interaction.member)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.error)
                    .setTitle('❌ Permission Denied')
                    .setDescription('You do not have permission to use this command.')
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';

            // Check if user is premium
            if (!await PermissionManager.isPremium(targetUser.id)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.warning)
                    .setTitle('⚠️ Not Premium')
                    .setDescription(`${targetUser} does not have premium status.`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Remove premium status
            await db.removePremiumUser(targetUser.id);

            // Get active bot count
            const activeBotsCount = minecraftBot.getBotCount(targetUser.id);

            // If user has multiple bots running, disconnect excess bots
            if (activeBotsCount > 1) {
                // Disconnect all bots except the first one
                const userBots = Array.from(minecraftBot.bots.entries())
                    .filter(([key]) => key.startsWith(targetUser.id));
                
                // Keep only the first bot
                for (let i = 1; i < userBots.length; i++) {
                    const [key] = userBots[i];
                    const [userId, serverId] = key.split('_');
                    minecraftBot.removeBot(userId, serverId);
                }
            }

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor(config.embedColors.success)
                .setTitle('⭐ Premium Status Removed')
                .setDescription(`Successfully removed premium status from ${targetUser}`)
                .addFields(
                    {
                        name: 'User',
                        value: targetUser.toString(),
                        inline: true
                    },
                    {
                        name: 'Removed By',
                        value: interaction.user.toString(),
                        inline: true
                    },
                    {
                        name: 'Reason',
                        value: reason,
                        inline: false
                    }
                )
                .setFooter({ text: `Premium status removed` })
                .setTimestamp();

            if (activeBotsCount > 1) {
                successEmbed.addFields({
                    name: 'Bot Connections',
                    value: `Disconnected ${activeBotsCount - 1} excess bot(s)`,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [successEmbed] });

            // Send DM to target user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.warning)
                    .setTitle('⚠️ Premium Status Removed')
                    .setDescription(`Your premium status has been removed in ${interaction.guild.name}`)
                    .addFields(
                        {
                            name: 'Removed By',
                            value: interaction.user.toString(),
                            inline: true
                        },
                        {
                            name: 'Reason',
                            value: reason,
                            inline: true
                        }
                    )
                    .setTimestamp();

                if (activeBotsCount > 1) {
                    dmEmbed.addFields({
                        name: 'Notice',
                        value: 'Your excess bot connections have been automatically disconnected.',
                        inline: false
                    });
                }

                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('Could not send DM to user:', error);
            }

            // Notify bot owner
            try {
                const ownerUser = await interaction.client.users.fetch(process.env.OWNER_ID);
                const ownerEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.warning)
                    .setTitle('⭐ Premium Status Removed')
                    .addFields(
                        {
                            name: 'User',
                            value: `${targetUser.tag} (${targetUser.id})`,
                            inline: true
                        },
                        {
                            name: 'Removed By',
                            value: `${interaction.user.tag} (${interaction.user.id})`,
                            inline: true
                        },
                        {
                            name: 'Server',
                            value: interaction.guild.name,
                            inline: true
                        },
                        {
                            name: 'Reason',
                            value: reason,
                            inline: false
                        }
                    )
                    .setTimestamp();

                await ownerUser.send({ embeds: [ownerEmbed] });
            } catch (error) {
                console.log('Could not send notification to owner:', error);
            }

            // Log to premium-logs channel
            try {
                const logChannel = interaction.guild.channels.cache.find(
                    channel => channel.name === 'premium-logs'
                );

                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(config.embedColors.warning)
                        .setTitle('⭐ Premium Status Removed')
                        .addFields(
                            {
                                name: 'User',
                                value: targetUser.toString(),
                                inline: true
                            },
                            {
                                name: 'Removed By',
                                value: interaction.user.toString(),
                                inline: true
                            },
                            {
                                name: 'Reason',
                                value: reason,
                                inline: false
                            }
                        )
                        .setFooter({ text: 'Premium status log' })
                        .setTimestamp();

                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (error) {
                console.log('Could not log to premium-logs channel:', error);
            }

        } catch (error) {
            console.error('Error in removepremium command:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Command Failed')
                .setDescription(`Failed to remove premium status: ${error.message}`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};