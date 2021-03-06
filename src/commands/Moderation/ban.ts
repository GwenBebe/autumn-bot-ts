import { Command, AMessage } from '../../interfaces/Client';
import { getGuildSettings, createInfraction } from '../../database';
import { TextChannel, MessageEmbed, GuildMember } from 'discord.js';
import { client } from '../..';
import { PromptManager } from '../../helpers/PromptManager';

const callback = async (message: AMessage, args: { member: GuildMember; reason?: string }, prompt: PromptManager) => {
    if (!message.guild || !message.member) return;

    const guildSettings = message.guild?.id ? await getGuildSettings(message.guild.id) : null;

    if (!guildSettings) return;

    const moderation = guildSettings.moderation;

    if (!moderation.enabled)
        return prompt.error(
            "Moderation isn't enabled on this server! A server administrator can turn it on with `{prefix}settings moderation enabled set true`"
        );

    const member = args.member;

    if (member.id === message.author.id) return prompt.error("You can't ban yourself!");

    if (message.member.roles.highest.position <= member.roles.highest.position) return prompt.error(`You can't ban ${member}!`);

    if (!member.bannable) return prompt.error(`I can't ban ${member}!`);

    const reason = args.reason;

    const infraction = await createInfraction(message, member.user.id, 'ban', reason || 'No Reason Provided');

    prompt.embed('Banned User', ` **• User:** ${member}\n **• Reason:** ${reason || 'No Reason Provided'}`, undefined, undefined, undefined, {
        text: `Case: ${infraction.case}`
    });

    member.ban({ reason: reason || 'No Reason Provided' }).catch(() => null);

    const modLog = moderation.modLog ? message.guild.channels.cache.get(moderation.modLog) : null;

    if (!modLog || !(modLog instanceof TextChannel)) return;

    return modLog.send(
        new MessageEmbed()
            .setAuthor('Moderation', client.user?.displayAvatarURL({ dynamic: true, format: 'png' }))
            .setTitle('User Banned')
            .setDescription(` **• User:** ${member}\n **• Reason:** ${reason || 'No Reason Provided'}\n **• Banned By:** ${message.author}`)
            .setColor(message.client.config.accentColor)
            .setFooter(`Case: ${infraction.case}`)
            .setTimestamp()
    );
};

export const command: Command = {
    name: 'ban',
    category: 'Moderation',
    module: 'Moderation',
    aliases: [],
    description: 'Bans the specified user from the server.',
    args: [
        {
            name: 'User',
            description: 'User that will be banned.',
            key: 'member',
            type: 'guildMember'
        },
        {
            name: 'Reason',
            description: 'Reason for banning',
            key: 'reason',
            type: 'string',
            optional: true
        }
    ],
    devOnly: false,
    guildOnly: true,
    NSFW: false,
    userPermissions: ['BAN_MEMBERS'],
    botPermissions: ['BAN_MEMBERS'],
    callback: callback
};
