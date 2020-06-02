import { Command, AMessage } from '../../interfaces/Client';
import { neko } from '../../neko';
import { MessageEmbed } from 'discord.js';
import Color from 'color';
import { PromptManager } from '../../interfaces/helpers/PromptManager';

const callback = async (message: AMessage, args: string[], prompt: PromptManager) => {
    if (!message.guild) return;

    const hue = Math.floor(Math.random() * 360);
    const pastel = 'hsl(' + hue + ', 100%, 80%)';

    const color = Color(pastel).hex();

    const member = await prompt.parse.member(message.guild, args.join(' '));
    if (!member) return;

    const result = await neko.sfw.tickle();

    message.channel.send(
        new MessageEmbed().setDescription(`*${message.member?.displayName} tickles ${member.displayName}*`).setColor(color).setImage(result.url).setTimestamp()
    );
};

export const command: Command = {
    name: 'tickle',
    category: 'Fun',
    module: 'Fun',
    aliases: [],
    description: 'Tickles the targeted user.',
    usage: '<user>',
    requiresArgs: 0,
    devOnly: false,
    guildOnly: true,
    NSFW: false,
    userPermissions: [],
    botPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
    callback: callback
};
