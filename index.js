require('dotenv').config();
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./utils/database');
const minecraftBot = require('./utils/minecraftBot');

// Create Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Initialize collections for commands
client.commands = new Collection();

// Load commands from each category
const commandCategories = ['general', 'minecraft', 'admin', 'staff', 'owner', 'premium'];

for (const category of commandCategories) {
    const commandsPath = path.join(__dirname, 'commands', category);
    try {
        if (!fs.existsSync(commandsPath)) {
            fs.mkdirSync(commandsPath, { recursive: true });
            continue;
        }
        
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                command.category = category;
                client.commands.set(command.data.name, command);
                console.log(`Loaded command: ${command.data.name} from category: ${category}`);
            } else {
                console.warn(`Command at ${filePath} is missing required "data" or "execute" property.`);
            }
        }
    } catch (error) {
        console.error(`Error loading commands from ${category}:`, error);
    }
}

// Event: Client Ready
client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity(require('./config.json').botStatus);
});

// Event: Interaction Create (Handle Commands)
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('Error executing command:', error);
        const errorMessage = {
            content: 'There was an error executing this command.',
            ephemeral: true
        };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// Event: Error Handler
client.on('error', error => {
    console.error('Discord client error:', error);
});

// Event: Disconnect Handler
client.on('disconnect', () => {
    console.log('Bot disconnected from Discord. Attempting to reconnect...');
});

// Event: Warning Handler
client.on('warn', info => {
    console.warn('Discord client warning:', info);
});

// Cleanup function for graceful shutdown
async function cleanup() {
    console.log('Shutting down bot...');
    
    // Disconnect all Minecraft bots
    minecraftBot.disconnectAll();
    
    // Close database connections
    if (db.premiumDB) db.premiumDB.close();
    if (db.usersDB) db.usersDB.close();
    
    // Destroy Discord client
    await client.destroy();
    
    process.exit(0);
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Login to Discord
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('Failed to login to Discord:', error);
    process.exit(1);
});