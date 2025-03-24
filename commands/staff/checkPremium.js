const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const PermissionManager = require('../../utils/permissions');
const db = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkpremium')
        .setDescription('Check a user\'s premium status')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // Check if user has permission to use this command
            if (!await PermissionManager.isStaff(interaction.member)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.error)
                    .setTitle('❌ Permission Denied')
                    .setDescription('You do not have permission to use this command.')
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            const targetUser = interaction.options.getUser('user');
            const isPremium = await PermissionManager.isPremium(targetUser.id);
            const userSettings = await db.getUserSettings(targetUser.id);

            // Get active Minecraft bots if any
            const activeBotsCount = userSettings ? 
                minecraftBot.getBotCount(targetUser.id) : 0;

            // Create status embed
            const statusEmbed = new EmbedBuilder()
                .setColor(isPremium ? config.embedColors.success : config.embedColors.primary)
                .setTitle(`${isPremium ? '⭐' : '👤'} Premium Status Check`)
                .setDescription(`Status check for ${targetUser}`)
                .addFields(
                    {
                        name: 'Premium Status',
                        value: isPremium ? '✅ Premium User' : '❌ Not Premium',
                        inline: true
                    },
                    {
                        name: 'User ID',
                        value: targetUser.id,
                        inline: true
                    }
                )
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `Checked by ${interaction.user.tag}` })
                .setTimestamp();

            // Add additional information if user has settings
            if (userSettings) {
                statusEmbed.addFields(
                    {
                        name: 'Minecraft Username',
                        value: userSettings.minecraft_username || 'Not set',
                        inline: true
                    },
                    {
                        name: 'Last Server',
                        value: userSettings.server_ip || 'None',
                        inline: true
                    },
                    {
                        name: 'Active Bots',
                        value: `${activeBotsCount}/${isPremium ? '∞' : '1'}`,
                        inline: true
                    },
                    {
                        name: 'Last Active',
                        value: new Date(userSettings.last_active).toLocaleString(),
                        inline: false
                    }
                );
            }

            // If premium, add premium details
            if (isPremium) {
                const premiumInfo = await db.premiumDB.prepare(
                    'SELECT granted_at, granted_by FROM premium_users WHERE user_id = ?'
                ).get(targetUser.id);

                if (premiumInfo) {
                    let grantedBy = 'Unknown';
                    try {
                        const granterUser = await interaction.client.users.fetch(premiumInfo.granted_by);
                        grantedBy = granterUser.tag;
                    } catch (error) {
                        console.log('Could not fetch granter user:', error);
                    }

                    statusEmbed.addFields(
                        {
                            name: 'Premium Since',
                            value: new Date(premiumInfo.granted_at).toLocaleString(),
                            inline: true
                        },
                        {
                            name: 'Granted By',
                            value: grantedBy,
                            inline: true
                        }
                    );
                }
            }

            await interaction.editReply({ embeds: [statusEmbed] });

        } catch (error) {
            console.error('Error in checkpremium command:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Command Failed')
                .setDescription(`Failed to check premium status: ${error.message}`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};