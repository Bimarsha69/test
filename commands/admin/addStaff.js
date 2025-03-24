const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');
const PermissionManager = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addstaff')
        .setDescription('Grant staff role to a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to grant staff role to')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply();

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

            const targetUser = interaction.options.getMember('user');
            const staffRole = interaction.guild.roles.cache.find(role => 
                role.name.toLowerCase() === config.roles.staff.toLowerCase()
            );

            // Check if staff role exists
            if (!staffRole) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.error)
                    .setTitle('❌ Role Not Found')
                    .setDescription(`The staff role "${config.roles.staff}" does not exist in this server.`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Check if user already has staff role
            if (targetUser.roles.cache.has(staffRole.id)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.warning)
                    .setTitle('⚠️ Already a Staff Member')
                    .setDescription(`${targetUser} already has the staff role.`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Add staff role
            await targetUser.roles.add(staffRole);

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor(config.embedColors.success)
                .setTitle('✅ Staff Role Granted')
                .setDescription(`Successfully granted staff role to ${targetUser}`)
                .addFields(
                    { name: 'User', value: targetUser.toString(), inline: true },
                    { name: 'Role', value: staffRole.toString(), inline: true },
                    { name: 'Granted By', value: interaction.user.toString(), inline: true }
                )
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

            // Send DM to target user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.primary)
                    .setTitle('🎉 Staff Role Granted')
                    .setDescription(`You have been granted the staff role in ${interaction.guild.name}`)
                    .addFields(
                        { name: 'Granted By', value: interaction.user.toString(), inline: true },
                        { name: 'Server', value: interaction.guild.name, inline: true }
                    )
                    .setTimestamp();

                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('Could not send DM to user:', error);
            }

        } catch (error) {
            console.error('Error in addstaff command:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Command Failed')
                .setDescription(`Failed to grant staff role: ${error.message}`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};