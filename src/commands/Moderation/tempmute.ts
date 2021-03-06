import { Command, AMessage } from '../../interfaces/Client';
import { getGuildSettings, createInfraction, updateGuildSettings } from '../../database';
import { createMutedRole } from '../../util';
import { TextChannel, MessageEmbed, GuildMember } from 'discord.js';
import { client } from '../..';
import prettyMs from 'pretty-ms';
import { PromptManager } from '../../helpers/PromptManager';

const callback = async (message: AMessage, args: { member: GuildMember; time: number; reason?: string }, prompt: PromptManager) => {
    if (!message.guild || !message.member) return;

    const guildSettings = message.guild?.id ? await getGuildSettings(message.guild.id) : null;

    if (!guildSettings) return;

    const moderation = guildSettings.moderation;

    if (!moderation.enabled)
        return prompt.error(
            "Moderation isn't enabled on this server! A server administrator can turn it on with `{prefix}settings moderation enabled set true`"
        );

    const member = args.member;
    const time = args.time;
    const reason = args.reason;

    if (member.id === message.author.id) return prompt.error("You can't mute yourself!");

    if (message.member.roles.highest.position <= member.roles.highest.position) return prompt.error(`You can't mute ${member}!`);

    if (!member.bannable) return prompt.error(`I can't mute ${member}!`);

    const mutedRole =
        (guildSettings.moderation.mutedRole ? message.guild.roles.cache.get(guildSettings.moderation.mutedRole) : null) ||
        (await createMutedRole(message.guild));

    if (!(guildSettings.moderation.mutedRole ? message.guild.roles.cache.get(guildSettings.moderation.mutedRole) : null)) {
        guildSettings.moderation.mutedRole = mutedRole.id;

        updateGuildSettings(message.guild.id, guildSettings);
    }

    member.roles.add(mutedRole);

    const infraction = await createInfraction(message, member.user.id, 'mute', reason || 'No Reason Provided', time);

    await member.send(
        new MessageEmbed()
            .setAuthor(message.guild.name, message.guild.iconURL({ dynamic: true, format: 'png' }) || undefined)
            .setTitle("You've been muted!")
            .setDescription(` **• Reason:** ${reason || 'No Reason Provided'}`)
            .setColor(message.client.config.accentColor)
            .setFooter(`Case: ${infraction.case}`)
            .setTimestamp()
    );

    prompt.embed(
        'Muted User',
        ` **• User:** ${member}\n **• Reason:** ${reason || 'No Reason Provided'}\n **• Expires In:** ${prettyMs(time)}`,
        undefined,
        undefined,
        undefined,
        { text: `Case: ${infraction.case}` }
    );

    const modLog = moderation.modLog ? message.guild.channels.cache.get(moderation.modLog) : null;

    if (!modLog || !(modLog instanceof TextChannel)) return;

    return modLog.send(
        new MessageEmbed()
            .setAuthor('Moderation', client.user?.displayAvatarURL({ dynamic: true, format: 'png' }))
            .setTitle('User Muted')
            .setDescription(
                ` **• User:** ${member}\n **• Reason:** ${reason || 'No Reason Provided'}\n **• Muted By:** ${message.author}\n **• Expires In:** ${prettyMs(
                    time
                )}`
            )
            .setColor(message.client.config.accentColor)
            .setFooter(`Case: ${infraction.case}`)
            .setTimestamp()
    );
};

export const command: Command = {
    name: 'tempmute',
    category: 'Moderation',
    module: 'Moderation',
    aliases: [],
    description: 'Mutes the specified user from the server.',
    args: [
        {
            name: 'User',
            description: 'User that will be muted',
            key: 'member',
            type: 'guildMember'
        },
        {
            name: 'Time',
            description: 'Amount of time to mute the user',
            key: 'time',
            type: 'timeLength'
        },
        {
            name: 'Reason',
            description: 'Reason for muting',
            key: 'reason',
            type: 'string',
            optional: true
        }
    ],
    devOnly: false,
    guildOnly: true,
    NSFW: false,
    userPermissions: ['MUTE_MEMBERS'],
    botPermissions: ['MANAGE_ROLES', 'MANAGE_CHANNELS'],
    callback: callback
};
