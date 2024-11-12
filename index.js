/**
 * @copyright Ghost Planet 2024
 * @author Friday
 * @license MIT
 * 
 * This code is protected under MIT License.
 * Please refer to the LICENSE file in the root directory.
 * 
 * Discord Server: https://discord.gg/zPjH55uCYt
 */

const { Client, GatewayIntentBits, Collection, Events, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Create a collection for commands
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    
    // Set the bot's status
    client.user.setPresence({
        activities: [{ 
            name: '/backup | /load-backup', 
            type: ActivityType.Watching 
        }],
        status: 'online',
    });

    // Set mobile status
    client.ws.broadcast({
        op: 3,
        d: {
            since: Date.now(),
            activities: [{
                name: '/backup | /load-backup',
                type: ActivityType.Watching
            }],
            status: 'online',
            afk: false,
            client_info: { client: 'mobile' }
        }
    });
});

// Handle interactions (slash commands)
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ 
            content: 'There was an error executing this command!', 
            ephemeral: true 
        });
    }
});

// Login to Discord with your client's token
client.login(process.env.TOKEN);
