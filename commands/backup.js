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

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('backup')
        .setDescription('Creates a backup of the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = interaction.guild;
            const backupId = crypto.randomBytes(3).toString('hex').toUpperCase();
            
            // Create initial embed
            const loadingEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('📦 Creating Backup...')
                .setDescription('Please wait while I backup your server...')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [loadingEmbed] });

            const backup = {
                backupId,
                name: guild.name,
                channels: [],
                roles: [],
                emojis: [],
                stickers: [],
                timestamp: new Date().toISOString()
            };

            // Backup roles
            const roles = await guild.roles.fetch();
            backup.roles = roles.map(role => ({
                name: role.name,
                color: role.color,
                hoist: role.hoist,
                position: role.position,
                permissions: role.permissions.toArray(),
                mentionable: role.mentionable
            })).filter(role => role.name !== '@everyone');

            // Backup channels
            const channels = await guild.channels.fetch();
            backup.channels = channels.map(channel => ({
                name: channel.name,
                type: channel.type,
                position: channel.position,
                parent: channel.parent?.name || null,
                topic: channel.topic || null,
                nsfw: channel.nsfw || false,
                bitrate: channel.bitrate || null,
                userLimit: channel.userLimit || null,
                rateLimitPerUser: channel.rateLimitPerUser || null,
                permissionOverwrites: channel.permissionOverwrites.cache.map(perm => ({
                    id: perm.id,
                    type: perm.type,
                    allow: perm.allow.toArray(),
                    deny: perm.deny.toArray()
                }))
            }));

            // Backup emojis with animation status
            const emojis = await guild.emojis.fetch();
            backup.emojis = emojis.map(emoji => ({
                name: emoji.name,
                url: emoji.url,
                animated: emoji.animated
            }));

            // Backup stickers
            const stickers = await guild.stickers.fetch();
            backup.stickers = stickers.map(sticker => ({
                name: sticker.name,
                description: sticker.description,
                tags: sticker.tags,
                url: sticker.url
            }));

            const backupPath = path.join(__dirname, '..', 'backups');
            await fs.mkdir(backupPath, { recursive: true });
            const fileName = `backup-${backupId}-${guild.id}.json`;
            await fs.writeFile(
                path.join(backupPath, fileName),
                JSON.stringify(backup, null, 2)
            );

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Backup Created Successfully!')
                .setDescription(`Your backup has been created with the following details:`)
                .addFields(
                    { name: '📋 Backup ID', value: `\`${backupId}\``, inline: true },
                    { name: '🏷️ Server Name', value: guild.name, inline: true },
                    { name: '📊 Statistics', value: 
                        `• ${backup.roles.length} Roles\n` +
                        `• ${backup.channels.length} Channels\n` +
                        `• ${backup.emojis.length} Emojis\n` +
                        `• ${backup.stickers.length} Stickers`
                    },
                    { name: '📝 Usage', value: `Use \`/load-backup ${backupId}\` to restore this backup.` }
                )
                .setFooter({ text: 'Backup Bot', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error(error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Error')
                .setDescription('An error occurred while creating the backup!')
                .addFields({ name: 'Error Details', value: `\`\`\`${error.message}\`\`\`` })
                .setFooter({ text: 'Backup Bot', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
}; 