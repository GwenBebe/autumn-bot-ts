import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { Client, ClientEventTypes, Command } from './interfaces/Client';
import { handleError } from './util';
import DBL from 'dblapi.js';
import { CronJob } from 'cron';
import { Logger } from './Logger';

if (process.env.NODE_ENV === 'development') Logger.setDebug(true);

/* 
    Initiates our client with the following options:
    - @everyone, @here and @role pings are DISABLES
    - Bot is listening to <prefix>help
    - Partials are enabled for messages and reactions. This allows for reaction roles
 */

export const client = new Client({
    disableMentions: 'everyone',
    presence: {
        activity: {
            name: `Bot Loading...`,
            type: 'LISTENING',
            url: 'https://www.twitch.tv/.'
        }
    },
    partials: ['MESSAGE', 'REACTION', 'CHANNEL']
});

export const updateActivity = async () => {
    return await client.user?.setActivity(`${client.guilds.cache.size} guilds | ${config.defaultPrefix}help`, {
        type: 'LISTENING',
        url: 'https://www.twitch.tv/.'
    });
};

export const dbl = process.env.NODE_ENV !== 'development' ? new DBL(config.dblToken, client) : undefined;

client.on('ready', () => {
    if (dbl && process.env.NODE_ENV !== 'development') {
        Logger.print('Posting Stats...', 'DBL');
        dbl.postStats(client.guilds.cache.size).then(() => Logger.print('Stats Posted', 'DBL'));
    }

    setInterval(() => {
        if (dbl && process.env.NODE_ENV !== 'development') {
            Logger.print('Posting Stats...', 'DBL');
            dbl.postStats(client.guilds.cache.size).then(() => Logger.print('Stats Posted', 'DBL'));
        }
    }, 1800000);
});

const listenerPath = path.join(__dirname, './events'),
    commandPath = path.join(__dirname, './commands'),
    taskPath = path.join(__dirname, './tasks');

// Imports your listeners from the events folder and forwards all Client-Events to those files
fs.readdirSync(listenerPath).forEach(file => {
    const event = require(`${listenerPath}/${file}`).default;
    const eventName = file.replace('.js', '') as ClientEventTypes;
    client.on(eventName, event.bind(null, client));
});

// Imports your commands from the commands folder and adds them to our client
fs.readdirSync(commandPath).forEach(async folder => {
    const commandFiles = fs.readdirSync(`${commandPath}/${folder}`).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command: Command = require(`${commandPath}/${folder}/${file}`).command;
        client.commands.set(command.name, command);
    }
});

export const startTasks = () => {
    // Imports your tasks from the tasks folder and starts them
    fs.readdirSync(taskPath).forEach(file => {
        const task: CronJob = require(path.join(taskPath, file)).task;
        task.start();
        Logger.print(`Starting ${file}`, 'Tasks');
    });
};

// Error Logging
process.on('uncaughtException', error => handleError(client, error));
process.on('unhandledRejection', error => {
    if (!error) error = new Error('An unhandled rejection occurred but it had no message!');
    //@ts-ignore
    if (error.stack) handleError(error);
});

client.login(client.config.token);
