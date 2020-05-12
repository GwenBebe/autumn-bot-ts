import { Message, MessageEmbed } from 'discord.js';
import { Command, Client } from '../../interfaces/Client';

const callback = async (message: Message, args: string[]) => {
    // Get the guild's settings if on a guild and determine the prefix that needs to be used in the help
    const client = message.client as Client;
    const guildSettings = message.guild ? await client.database.guildSettings.findOne({ guild: message.guild.id }) : null;
    const prefix = guildSettings?.prefix || client.config.defaultPrefix;

    // Initiate the output embed
    const output = new MessageEmbed().setTimestamp().setColor('RANDOM');

    // If no arguments are provided, send all commands
    if (!args.length) {
        // Do some Voodoo magic to create an object having all commands sorted by their category
        const commandList: { [key: string]: string[] } = {};
        client.commands.forEach(command => {
            if (!commandList[command.category]) commandList[command.category] = [];
            commandList[command.category].push(`\`${prefix}${command.name}\` - ${command.description || 'This command has no description.'}`);
        });

        output
            .setTitle('Help menu')
            .setFooter(`To get info on a specific command, use ${prefix}help [command name]`)
            .addFields(
                // Create one field per category having all commands separated by new lines
                Object.keys(commandList).map(category => {
                    return { name: category, value: commandList[category].join('\n') };
                })
            );
        return message.channel.send(output);
    }

    // Get the command from the provided args
    const commandName = args.join(' ').toLowerCase();
    const command = client.commands.find(cmd => cmd.name === commandName || cmd.aliases.includes(commandName));
    if (!command) return message.channel.send('That is not a valid command!');

    output
        .setTitle(command.name)
        .setDescription(command.description)
        .addFields([
            { name: 'Usage', value: `${prefix}${command.name}${command.usage ? ' ' + command.usage : ''}` },
            { name: 'Aliases', value: command.aliases.join(', ') || 'This command has no aliases.' }
        ]);

    return message.channel.send(output);
};

export const command: Command = {
    name: 'help',
    category: 'Utility',
    aliases: ['h'],
    description: 'Get a list of all commands or info on a specific command',
    usage: '[command name]',
    requiresArgs: 0,
    devOnly: false,
    guildOnly: false,
    userPermissions: '',
    botPermissions: '',
    callback: callback
};
