const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');
const PermissionManager = require('../../utils/permissions');
const db = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listpremiumusers')
        .setDescription('Show a list of all premium users')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

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

            // Get all premium users
            const premiumUsers = await db.listPremiumUsers();

            // If no premium users found
            if (premiumUsers.length === 0) {
                const emptyEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.primary)
                    .setTitle('⭐ Premium Users')
                    .setDescription('There are no premium users at the moment.')
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [emptyEmbed] });
            }

            // Create chunks of users (Discord has a limit of 25 fields per embed)
            const chunks = [];
            for (let i = 0; i < premiumUsers.length; i += 25) {
                chunks.push(premiumUsers.slice(i, i + 25));
            }

            // Create embeds for each chunk
            const embeds = [];
            for (let i = 0; i < chunks.length; i++) {
                const embed = new EmbedBuilder()
                    .setColor(config.embedColors.primary)
                    .setTitle(`⭐ Premium Users ${chunks.length > 1 ? `(Page ${i + 1}/${chunks.length})` : ''}`)
                    .setDescription(`Total Premium Users: ${premiumUsers.length}`);

                // Process each user in the chunk
                for (const user of chunks[i]) {
                    try {
                        const discordUser = await interaction.client.users.fetch(user.user_id);
                        const granterUser = await interaction.client.users.fetch(user.granted_by);
                        const grantedDate = new Date(user.granted_at).toLocaleString();

                        embed.addFields({
                            name: discordUser.tag,
                            value: `ID: ${user.user_id}\nGranted by: ${granterUser.tag}\nGranted on: ${grantedDate}`,
                            inline: true
                        });
                    } catch (error) {
                        console.log(`Could not fetch user info for ${user.user_id}:`, error);
                        embed.addFields({
                            name: `Unknown User (${user.user_id})`,
                            value: `Granted on: ${new Date(user.granted_at).toLocaleString()}`,
                            inline: true
                        });
                    }
                }

                embed.setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();

                embeds.push(embed);
            }

            // Send the first embed
            const response = await interaction.editReply({
                embeds: [embeds[0]],
                components: embeds.length > 1 ? [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('prev_page')
                                .setLabel('Previous')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('next_page')
                                .setLabel('Next')
                                .setStyle(ButtonStyle.Primary)
                        )
                ] : []
            });

            // If there are multiple pages, set up pagination
            if (embeds.length > 1) {
                let currentPage = 0;

                const collector = response.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 300000 // 5 minutes
                });

                collector.on('collect', async i => {
                    if (i.customId === 'prev_page') {
                        currentPage--;
                    } else if (i.customId === 'next_page') {
                        currentPage++;
                    }

                    // Update button states
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('prev_page')
                                .setLabel('Previous')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(currentPage === 0),
                            new ButtonBuilder()
                                .setCustomId('next_page')
                                .setLabel('Next')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(currentPage === embeds.length - 1)
                        );

                    await i.update({
                        embeds: [embeds[currentPage]],
                        components: [row]
                    });
                });

                collector.on('end', () => {
                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('prev_page')
                                .setLabel('Previous')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('next_page')
                                .setLabel('Next')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true)
                        );

                    interaction.editReply({
                        components: [disabledRow]
                    }).catch(() => {});
                });
            }

        } catch (error) {
            console.error('Error in listpremiumusers command:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Command Failed')
                .setDescription(`Failed to list premium users: ${error.message}`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};