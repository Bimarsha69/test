const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const PermissionManager = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows a list of available commands'),

    async execute(interaction) {
        const member = interaction.member;
        const permLevel = await PermissionManager.getPermissionLevel(member);

        // Create category descriptions
        const categories = {
            general: {
                name: '📋 General Commands',
                description: 'Basic commands available to all users',
                commands: [
                    { name: 'help', description: 'Shows this help menu' },
                    { name: 'ping', description: 'Check bot latency' }
                ]
            },
            minecraft: {
                name: '🎮 Minecraft Commands',
                description: 'Commands for managing Minecraft bot connections',
                commands: [
                    { name: 'join', description: 'Make the bot join a Minecraft server' },
                    { name: 'leave', description: 'Make the bot leave the server' },
                    { name: 'listplayers', description: 'Show online players' },
                    { name: 'chat', description: 'Send a chat message' },
                    { name: 'serverstatus', description: 'Check server status' }
                ]
            }
        };

        // Add premium commands if user is premium
        if (await PermissionManager.isPremium(member.id)) {
            categories.premium = {
                name: '⭐ Premium Commands',
                description: 'Special commands for premium users',
                commands: [
                    { name: 'rename', description: 'Rename your Minecraft bot' }
                ]
            };
        }

        // Add staff commands if user is staff
        if (await PermissionManager.isStaff(member)) {
            categories.staff = {
                name: '🛡️ Staff Commands',
                description: 'Commands for server staff',
                commands: [
                    { name: 'checkpremium', description: 'Check a user\'s premium status' }
                ]
            };
        }

        // Add admin commands if user is admin
        if (await PermissionManager.isAdmin(member)) {
            categories.admin = {
                name: '⚔️ Admin Commands',
                description: 'Administrative commands',
                commands: [
                    { name: 'addadmin', description: 'Grant admin role to a user' },
                    { name: 'removeadmin', description: 'Remove admin role from a user' },
                    { name: 'addstaff', description: 'Grant staff role to a user' },
                    { name: 'removestaff', description: 'Remove staff role from a user' },
                    { name: 'generatepremiumcode', description: 'Generate a premium code' }
                ]
            };
        }

        // Add owner commands if user is owner
        if (PermissionManager.isOwner(member.id)) {
            categories.owner = {
                name: '👑 Owner Commands',
                description: 'Bot owner commands',
                commands: [
                    { name: 'setstatus', description: 'Change bot status' },
                    { name: 'setbotavatar', description: 'Change bot avatar' },
                    { name: 'shutdown', description: 'Shut down the bot' }
                ]
            };
        }

        // Create the select menu for categories
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('Select a category')
            .addOptions(Object.entries(categories).map(([id, category]) => ({
                label: category.name,
                description: category.description,
                value: id
            })));

        // Create the initial embed
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.primary)
            .setTitle('📚 Command Help')
            .setDescription('Select a category from the dropdown menu below to view available commands.')
            .setFooter({ text: `Requested by ${interaction.user.tag}` })
            .setTimestamp();

        // Send the initial message with the select menu
        const row = new ActionRowBuilder().addComponents(selectMenu);
        const response = await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });

        // Create a collector for the select menu
        const collector = response.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on('collect', async i => {
            const category = categories[i.values[0]];
            const categoryEmbed = new EmbedBuilder()
                .setColor(config.embedColors.primary)
                .setTitle(`${category.name}`)
                .setDescription(category.description)
                .addFields(
                    category.commands.map(cmd => ({
                        name: `/${cmd.name}`,
                        value: cmd.description
                    }))
                )
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await i.update({ embeds: [categoryEmbed], components: [row] });
        });

        collector.on('end', async () => {
            selectMenu.setDisabled(true);
            const disabledRow = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.editReply({
                components: [disabledRow]
            }).catch(() => {});
        });
    }
};