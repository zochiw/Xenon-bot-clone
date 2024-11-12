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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('load-backup')
        .setDescription('Loads a backup into the current server')
        .addStringOption(option =>
            option.setName('backup-id')
                .setDescription('The ID of the backup to load')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const backupId = interaction.options.getString('backup-id');
            const guild = interaction.guild;

            const backupPath = path.join(__dirname, '..', 'backups');
            const backupFiles = await fs.readdir(backupPath);
            const backupFile = backupFiles.find(file => file.includes(backupId));

            if (!backupFile) {
                return await interaction.editReply({
                    content: 'Backup not found! Please check the backup ID.',
                    ephemeral: true
                });
            }

            const backupData = JSON.parse(
                await fs.readFile(path.join(backupPath, backupFile), 'utf-8')
            );

            // Check for community features in backup
            const hasCommunityFeatures = backupData.channels.some(channel => 
                [ChannelType.GuildForum, ChannelType.GuildAnnouncement].includes(channel.type)
            );

            if (hasCommunityFeatures && !guild.features.includes('COMMUNITY')) {
                return await interaction.editReply({
                    content: '⚠️ This backup contains community features (forums/announcement channels) but the target server is not a Community server. Please enable Community features in Server Settings before loading this backup.',
                    ephemeral: true
                });
            }

            const confirmationMessage = await interaction.editReply({
                content: `⚠️ WARNING: This will delete all current channels, roles, emojis, and stickers in the server and replace them with the backup data. Are you sure? Reply with \`confirm\` within 30 seconds to proceed.`,
                ephemeral: true
            });

            const filter = m => m.author.id === interaction.user.id && m.content.toLowerCase() === 'confirm';
            const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

            collector.on('collect', async () => {
                try {
                    // Create a new channel for status updates with better UI
                    const statusChannel = await guild.channels.create({
                        name: '📋・backup-status',
                        type: ChannelType.GuildText,
                    });

                    const startEmbed = new EmbedBuilder()
                        .setColor('#FFA500')
                        .setTitle('🔄 Backup Restoration Started')
                        .setDescription('The backup restoration process has begun.')
                        .setTimestamp();
                    await statusChannel.send({ embeds: [startEmbed] });

                    // Update status with embeds
                    const createStatusEmbed = (title, description, color = '#FFA500') => {
                        return new EmbedBuilder()
                            .setColor(color)
                            .setTitle(title)
                            .setDescription(description)
                            .setTimestamp();
                    };

                    // Use embeds for status updates
                    await statusChannel.send({ 
                        embeds: [createStatusEmbed('🗑️ Cleanup', 'Deleting existing server content...')]
                    });

                    // Delete existing content
                    await statusChannel.send('Deleting existing server content...');
                    
                    // Delete roles (except @everyone)
                    const roles = await guild.roles.fetch();
                    for (const role of roles.values()) {
                        if (role.name !== '@everyone' && role.position < guild.members.me.roles.highest.position) {
                            await role.delete().catch(console.error);
                        }
                    }

                    // Delete all channels except status channel and required community channels
                    const channels = await guild.channels.fetch();
                    for (const channel of channels.values()) {
                        if (channel.id !== statusChannel.id) {
                            try {
                                await channel.delete();
                            } catch (error) {
                                if (error.code === 50074) { // Cannot delete a channel required for community servers
                                    await statusChannel.send(`⚠️ Skipping deletion of required community channel "${channel.name}"`);
                                } else {
                                    console.error(`Error deleting channel ${channel.name}:`, error);
                                }
                            }
                        }
                    }

                    // Delete emojis and stickers
                    const emojis = await guild.emojis.fetch();
                    for (const emoji of emojis.values()) {
                        await emoji.delete().catch(console.error);
                    }

                    const stickers = await guild.stickers.fetch();
                    for (const sticker of stickers.values()) {
                        await sticker.delete().catch(console.error);
                    }

                    await statusChannel.send({ 
                        embeds: [createStatusEmbed('👥 Roles', 'Restoring roles...')]
                    });
                    // Create roles in reverse order (highest position first)
                    const sortedRoles = backupData.roles.sort((a, b) => b.position - a.position);
                    for (const roleData of sortedRoles) {
                        await guild.roles.create({
                            name: roleData.name,
                            color: roleData.color,
                            hoist: roleData.hoist,
                            permissions: roleData.permissions,
                            mentionable: roleData.mentionable
                        }).catch(console.error);
                    }

                    await statusChannel.send({ 
                        embeds: [createStatusEmbed('📁 Categories', 'Restoring categories...')]
                    });
                    // Create categories first and store their references
                    const categoryMap = new Map();
                    const categories = backupData.channels.filter(channel => 
                        channel.type === ChannelType.GuildCategory
                    ).sort((a, b) => a.position - b.position);

                    for (const categoryData of categories) {
                        const category = await guild.channels.create({
                            name: categoryData.name,
                            type: ChannelType.GuildCategory,
                            position: categoryData.position,
                            permissionOverwrites: categoryData.permissionOverwrites
                        }).catch(console.error);
                        if (category) categoryMap.set(categoryData.name, category);
                    }

                    await statusChannel.send({ 
                        embeds: [createStatusEmbed('💬 Channels', 'Restoring channels...')]
                    });
                    // Create channels in order by type and position
                    const nonCategories = backupData.channels.filter(channel => 
                        channel.type !== ChannelType.GuildCategory
                    ).sort((a, b) => {
                        // Sort by type priority and position
                        if (a.type !== b.type) {
                            // Prioritize announcement channels, then text, then others
                            const typePriority = {
                                [ChannelType.GuildAnnouncement]: 0,
                                [ChannelType.GuildText]: 1,
                                [ChannelType.GuildForum]: 2,
                                [ChannelType.GuildVoice]: 3,
                                [ChannelType.GuildStageVoice]: 4
                            };
                            return (typePriority[a.type] || 99) - (typePriority[b.type] || 99);
                        }
                        return a.position - b.position;
                    });

                    for (const channelData of nonCategories) {
                        const parent = channelData.parent ? categoryMap.get(channelData.parent) : null;

                        // Skip forum channels if community is not enabled
                        if (channelData.type === ChannelType.GuildForum && !guild.features.includes('COMMUNITY')) {
                            await statusChannel.send(`⚠️ Skipping forum channel "${channelData.name}" as Community is not enabled.`);
                            continue;
                        }

                        try {
                            await guild.channels.create({
                                name: channelData.name,
                                type: channelData.type,
                                parent: parent?.id,
                                topic: channelData.topic,
                                nsfw: channelData.nsfw,
                                bitrate: channelData.bitrate,
                                userLimit: channelData.userLimit,
                                rateLimitPerUser: channelData.rateLimitPerUser,
                                position: channelData.position,
                                permissionOverwrites: channelData.permissionOverwrites
                            });
                        } catch (error) {
                            await statusChannel.send(`⚠️ Failed to create channel "${channelData.name}": ${error.message}`);
                        }
                    }

                    await statusChannel.send({ 
                        embeds: [createStatusEmbed('😀 Emojis & Stickers', 'Restoring emojis and stickers...')]
                    });
                    // Restore emojis with animation status
                    for (const emojiData of backupData.emojis) {
                        try {
                            await guild.emojis.create({
                                attachment: emojiData.url,
                                name: emojiData.name,
                                // Only animated emojis can use GIF format
                                reason: `Backup restoration - ${emojiData.animated ? 'Animated' : 'Static'} emoji`
                            });
                        } catch (error) {
                            await statusChannel.send(`⚠️ Failed to create emoji "${emojiData.name}": ${error.message}`);
                        }
                    }

                    // Restore stickers
                    for (const stickerData of backupData.stickers) {
                        try {
                            await guild.stickers.create({
                                file: stickerData.url,
                                name: stickerData.name,
                                tags: stickerData.tags,
                                reason: 'Backup restoration - Sticker'
                            });
                        } catch (error) {
                            await statusChannel.send(`⚠️ Failed to create sticker "${stickerData.name}": ${error.message}`);
                        }
                    }

                    // Final success message
                    const successEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('✅ Backup Restored Successfully!')
                        .setDescription('All components have been restored.')
                        .setFooter({ text: 'This channel will be deleted in 10 seconds.' })
                        .setTimestamp();

                    await statusChannel.send({ embeds: [successEmbed] });

                    // Delete the status channel after 10 seconds
                    setTimeout(() => {
                        statusChannel.delete().catch(console.error);
                    }, 10000);

                } catch (error) {
                    console.error('Restoration error:', error);
                    if (statusChannel) {
                        const errorEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('❌ Error During Restoration')
                            .setDescription(`An error occurred: ${error.message}`)
                            .setTimestamp();
                        await statusChannel.send({ embeds: [errorEmbed] });
                    }
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.channel.send({
                        content: 'Backup restoration cancelled - no confirmation received.',
                        ephemeral: true
                    }).catch(console.error);
                }
            });

        } catch (error) {
            console.error(error);
            await interaction.channel.send({
                content: 'An error occurred while loading the backup!',
                ephemeral: true
            }).catch(console.error);
        }
    },
};