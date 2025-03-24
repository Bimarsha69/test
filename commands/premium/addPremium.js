const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');
const PermissionManager = require('../../utils/permissions');
const db = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addpremium')
        .setDescription('Grant premium status to a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to grant premium to')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('code')
                .setDescription('Premium code to use (Admin only)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const targetUser = interaction.options.getUser('user');
            const premiumCode = interaction.options.getString('code');
            const isAdmin = await PermissionManager.isAdmin(interaction.member);

            // If not admin, check if using a valid premium code
            if (!isAdmin && !premiumCode) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.error)
                    .setTitle('❌ Premium Code Required')
                    .setDescription('You must provide a valid premium code to grant premium status.')
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Check if user is already premium
            if (await PermissionManager.isPremium(targetUser.id)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.warning)
                    .setTitle('⚠️ Already Premium')
                    .setDescription(`${targetUser} already has premium status.`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // If using a code, validate it
            if (premiumCode) {
                const isValidCode = await db.usePremiumCode(premiumCode, targetUser.id);
                if (!isValidCode) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(config.embedColors.error)
                        .setTitle('❌ Invalid Premium Code')
                        .setDescription('The provided premium code is invalid or has already been used.')
                        .setFooter({ text: `Requested by ${interaction.user.tag}` })
                        .setTimestamp();

                    return await interaction.editReply({ embeds: [errorEmbed] });
                }
            }

            // Grant premium status
            await db.addPremiumUser(targetUser.id, interaction.user.id);

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor(config.embedColors.success)
                .setTitle('⭐ Premium Status Granted')
                .setDescription(`Successfully granted premium status to ${targetUser}`)
                .addFields(
                    {
                        name: 'User',
                        value: targetUser.toString(),
                        inline: true
                    },
                    {
                        name: 'Granted By',
                        value: interaction.user.toString(),
                        inline: true
                    }
                )
                .setFooter({ text: `Premium status granted` })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

            // Send DM to target user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.primary)
                    .setTitle('🎉 Premium Status Granted!')
                    .setDescription(`You have been granted premium status in ${interaction.guild.name}!`)
                    .addFields(
                        {
                            name: 'Benefits',
                            value: '• Multiple Minecraft bot connections\n• Custom bot usernames\n• Premium-only features',
                            inline: false
                        },
                        {
                            name: 'Granted By',
                            value: interaction.user.toString(),
                            inline: true
                        }
                    )
                    .setTimestamp();

                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('Could not send DM to user:', error);
            }

            // Notify bot owner
            try {
                const ownerUser = await interaction.client.users.fetch(process.env.OWNER_ID);
                const ownerEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.primary)
                    .setTitle('⭐ New Premium User')
                    .addFields(
                        {
                            name: 'User',
                            value: `${targetUser.tag} (${targetUser.id})`,
                            inline: true
                        },
                        {
                            name: 'Granted By',
                            value: `${interaction.user.tag} (${interaction.user.id})`,
                            inline: true
                        },
                        {
                            name: 'Server',
                            value: interaction.guild.name,
                            inline: true
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
                        .setColor(config.embedColors.primary)
                        .setTitle('⭐ Premium Status Granted')
                        .addFields(
                            {
                                name: 'User',
                                value: targetUser.toString(),
                                inline: true
                            },
                            {
                                name: 'Granted By',
                                value: interaction.user.toString(),
                                inline: true
                            },
                            {
                                name: 'Method',
                                value: premiumCode ? 'Premium Code' : 'Admin Grant',
                                inline: true
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
            console.error('Error in addpremium command:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Command Failed')
                .setDescription(`Failed to grant premium status: ${error.message}`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};