const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');
const PermissionManager = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addadmin')
        .setDescription('Grant admin role to a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to grant admin role to')
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
            const adminRole = interaction.guild.roles.cache.find(role => 
                role.name.toLowerCase() === config.roles.admin.toLowerCase()
            );

            // Check if admin role exists
            if (!adminRole) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.error)
                    .setTitle('❌ Role Not Found')
                    .setDescription(`The admin role "${config.roles.admin}" does not exist in this server.`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Check if user already has admin role
            if (targetUser.roles.cache.has(adminRole.id)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.warning)
                    .setTitle('⚠️ Already an Admin')
                    .setDescription(`${targetUser} already has the admin role.`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Add admin role
            await targetUser.roles.add(adminRole);

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor(config.embedColors.success)
                .setTitle('✅ Admin Role Granted')
                .setDescription(`Successfully granted admin role to ${targetUser}`)
                .addFields(
                    { name: 'User', value: targetUser.toString(), inline: true },
                    { name: 'Role', value: adminRole.toString(), inline: true },
                    { name: 'Granted By', value: interaction.user.toString(), inline: true }
                )
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

            // Send DM to target user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.primary)
                    .setTitle('🎉 Admin Role Granted')
                    .setDescription(`You have been granted the admin role in ${interaction.guild.name}`)
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
            console.error('Error in addadmin command:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Command Failed')
                .setDescription(`Failed to grant admin role: ${error.message}`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};