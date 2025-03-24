const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const minecraftBot = require('../../utils/minecraftBot');
const PermissionManager = require('../../utils/permissions');
const db = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Make the bot join a Minecraft server')
        .addStringOption(option =>
            option.setName('ip')
                .setDescription('The IP address of the Minecraft server')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('port')
                .setDescription('The port of the Minecraft server (default: 25565)')
                .setMinValue(1)
                .setMaxValue(65535))
        .addStringOption(option =>
            option.setName('version')
                .setDescription('Minecraft version to use')
                .addChoices(
                    ...config.supportedVersions.map(version => ({
                        name: version,
                        value: version
                    }))
                ))
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Custom username for the bot (Premium users only)')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const userId = interaction.user.id;
            const serverId = interaction.guild.id;
            const isPremium = await PermissionManager.isPremium(userId);
            
            // Get options
            const ip = interaction.options.getString('ip');
            const port = interaction.options.getInteger('port') || 25565;
            const version = interaction.options.getString('version') || config.supportedVersions[0];
            let username = interaction.options.getString('username');

            // Check if user can create more bots
            const currentBotCount = minecraftBot.getBotCount(userId);
            if (!await PermissionManager.canManageBots(interaction.member, currentBotCount)) {
                throw new Error('You have reached your maximum number of bot connections. Premium users can create multiple connections.');
            }

            // Validate username for non-premium users
            if (username && !isPremium) {
                const embed = new EmbedBuilder()
                    .setColor(config.embedColors.error)
                    .setTitle('❌ Custom Username Not Allowed')
                    .setDescription('Only premium users can use custom usernames. The default username will be used instead.')
                    .setFooter({ text: 'Upgrade to premium to use custom usernames!' });
                
                await interaction.editReply({ embeds: [embed] });
                username = config.defaultMinecraftUsername;
            }

            // Create loading embed
            const loadingEmbed = new EmbedBuilder()
                .setColor(config.embedColors.primary)
                .setTitle('🔄 Connecting to Server...')
                .setDescription(`Attempting to connect to ${ip}:${port} using version ${version}`)
                .setTimestamp();

            await interaction.editReply({ embeds: [loadingEmbed] });

            // Create bot instance
            const bot = await minecraftBot.createBot(userId, serverId, {
                ip,
                port,
                version,
                username: username || config.defaultMinecraftUsername
            });

            // Update user settings in database
            await db.updateUserSettings(userId, {
                minecraft_username: username || config.defaultMinecraftUsername,
                server_ip: ip,
                is_premium: isPremium
            });

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor(config.embedColors.success)
                .setTitle('✅ Successfully Connected!')
                .setDescription(`Bot connected to ${ip}:${port}`)
                .addFields(
                    { 
                        name: 'Username', 
                        value: username || config.defaultMinecraftUsername, 
                        inline: true 
                    },
                    { 
                        name: 'Version', 
                        value: version, 
                        inline: true 
                    },
                    {
                        name: 'Active Connections',
                        value: `${minecraftBot.getBotCount(userId)}/${isPremium ? '∞' : '1'}`,
                        inline: true
                    }
                )
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in join command:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Connection Failed')
                .setDescription(`Failed to connect to the server: ${error.message}`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};