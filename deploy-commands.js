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
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Started refreshing global application (/) commands.');

        // Delete all existing global commands
        console.log('Deleting old commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: [] }
        );

        // Register new global commands
        console.log('Registering new commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log('Successfully reloaded global application (/) commands.');
    } catch (error) {
        console.error('Error:', error);
    }
})(); 