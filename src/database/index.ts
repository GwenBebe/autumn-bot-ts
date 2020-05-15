import mongoose from 'mongoose';
import { config } from '../../config';
import { Infraction, InfractionTypes } from './schemas/Infraction';
import { Message } from 'discord.js';
import { GuildSettings } from './schemas/GuildSettings';
import { UserProfile } from './schemas/UserProfile';

// Connect to MongoDB
mongoose.connect(config.mongoString, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true
});
const db = mongoose.connection;

// Log Database Errors
db.on('error', err => console.error(err));

// Log a message once the Database connection is made
db.once('open', () => console.log(`Connected to MongoDB Atlas at ${db.name}!`));

// Export our database with the different Schemas
export const database = {
    infractions: Infraction,
    guildSettings: GuildSettings,
    userProfiles: UserProfile
};

// Helper function to get a guild's settings
export const getGuildSettings = async (guildId: string) => {
    return (await GuildSettings.findOne({ guild: guildId })) || (await GuildSettings.create({ guild: guildId }));
};

export const updateGuildSettings = async (guildId: string, settings: GuildSettings) => {
    await GuildSettings.updateOne({ guild: guildId }, settings);
};

// Helper function to get a guild's infractions
export const getGuildInfractions = async (guildId: string) => {
    return await Infraction.findOne({ guild: guildId });
};

// Helper function to get a users' infractions on a guild
export const getUserInfractions = async (guildId: string, userId: string) => {
    return await Infraction.findOne({ guild: guildId, user: userId });
};

// Helper function to get a users' profile
export const getUserProfile = async (userID: string) => {
    return await UserProfile.findOne({ userID: userID });
};

export type profileProperty = 'color' | 'pronouns' | 'gender' | 'age' | 'biography';

// Helper function to update a users' profile
export const updateUserProfile = async (userId: string, property: profileProperty, value: string) => {
    const entry = await UserProfile.findOne({ userID: userId });
    if (!entry) return;
    switch (property) {
        case 'color':
            entry.color = value;
            break;
        case 'pronouns':
            entry.pronouns = value;
            break;
        case 'gender':
            entry.gender = value;
            break;
        case 'age':
            entry.age = value;
            break;
        case 'biography':
            entry.biography = value;
            break;
        default:
            break;
    }
    entry.save();
};

// Helper function to create a user profile
export const createUserProfile = async (userId: string, color: string, pronouns: string, gender: string, age: string, biography: string) => {
    const profile = await UserProfile.create({
        userID: userId,
        color: color,
        pronouns: pronouns,
        gender: gender,
        age: age,
        biography: biography
    });
    return profile;
};

// Helper function to create modlog entries
export const createInfraction = async (message: Message, userId: string, infractionType: InfractionTypes, reason: string, duration?: number) => {
    if (!message.guild) throw new Error('This function was called from a dm. Please make sure all commands using this can only be used on servers');
    const cases = (await Infraction.find({ guild: message.guild.id })).map(i => i.case);
    const end = duration ? message.createdTimestamp + duration : null;
    const infraction = await Infraction.create({
        guild: message.guild.id,
        user: userId,
        infractionType: infractionType,
        timestamp: message.createdTimestamp,
        endTimestamp: end,
        needsTiming: duration !== undefined,
        reason: reason,
        moderator: {
            id: message.author.id,
            tag: message.author.tag
        },
        case: (cases.length ? Math.max(...cases) : 0) + 1
    });
    infraction.save();
    return infraction;
};