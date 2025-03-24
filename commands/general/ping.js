const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s latency and API response time'),

    async execute(interaction) {
        // Initial response
        const sent = await interaction.reply({ 
            content: 'Pinging...', 
            fetchReply: true 
        });

        // Calculate latencies
        const websocketPing = interaction.client.ws.ping;
        const roundtripPing = sent.createdTimestamp - interaction.createdTimestamp;

        // Create embed with ping information
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.primary)
            .setTitle('🏓 Pong!')
            .addFields(
                { 
                    name: 'Bot Latency', 
                    value: `${roundtripPing}ms`, 
                    inline: true 
                },
                { 
                    name: 'API Latency', 
                    value: `${websocketPing}ms`, 
                    inline: true 
                }
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}` })
            .setTimestamp();

        // Update the response with the embed
        await interaction.editReply({ 
            content: null, 
            embeds: [embed] 
        });
    },
};