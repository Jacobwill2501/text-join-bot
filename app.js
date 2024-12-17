import 'dotenv/config';
import {
	Client,
	GatewayIntentBits,
	SlashCommandBuilder,
	REST,
	Routes,
} from 'discord.js';
import { KeyValueDB } from './database/KeyValueDB.js';
import { monitor, stopmonitor } from './commands/index.js';

// Replace with your bot's token and client ID
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.APP_ID;
const MONITORED_ASKER_DB_PATH = './database/monitored-asker.txt';
const ASKER_NUMBER_DB_PATH = './database/asker-number.txt';

const monitoredAskerDB = new KeyValueDB(MONITORED_ASKER_DB_PATH);
const askerNumberDB = new KeyValueDB(ASKER_NUMBER_DB_PATH);

// Create a client instance
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates, // Required to monitor voice state updates
	],
});

// Register slash commands
(async () => {
	const commands = [
		new SlashCommandBuilder()
			.setName('monitor')
			.setDescription('Monitor a user for voice channel joins')
			.addUserOption((option) =>
				option
					.setName('user')
					.setDescription('The user to monitor')
					.setRequired(true)
			)
			.addStringOption((option) =>
				option
					.setName('phone-number')
					.setDescription('Phone Number to be notified to')
					.setMaxLength(10)
					.setRequired(true)
			),
		new SlashCommandBuilder()
			.setName('stopmonitor')
			.setDescription('Stop monitoring a user')
			.addUserOption((option) =>
				option
					.setName('user')
					.setDescription('The user to stop monitoring')
					.setRequired(true)
			),
	].map((command) => command.toJSON());

	const rest = new REST({ version: '10' }).setToken(TOKEN);

	try {
		console.log('Registering slash commands...');
		await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
		console.log('Slash commands registered successfully!');
	} catch (error) {
		console.error('Error registering commands:', error);
	}
})();

// Bot event: ready
client.once('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);
});

// Bot event: slash command interaction
client.on('interactionCreate', async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	switch (interaction.commandName) {
		case 'monitor':
			monitor();
			break;
		case 'stopmonitor':
			stopmonitor();
			break;
		default:
			console.log('no command');
			break;
	}
});

// Bot event: voice state update
client.on('voiceStateUpdate', async (oldState, newState) => {
	// Check if the user joined a voice channel
	if (!oldState.channel && newState.channel) {
		const monitoredUserId = newState.id; // The user who triggered the event
		const value = await monitoredAskerDB.read(monitoredUserId);

		// Check if this user is being monitored
		if (value) {
			for (const monitor of value) {
				const result = await askerNumberDB.read(monitor); //TODO: add error handling eventually
				const [phoneNumber] = result || [];
				//monitor is the id of the person monitoring
				client.users.fetch(monitor).then((notifier) => {
					notifier.send(
						`${newState.member.user.tag} joined the voice channel: ${newState.channel.name}. Sending text to ${phoneNumber}`
					);

					// send text instead
				});
			}
		}
	}
});

client.login(TOKEN);
