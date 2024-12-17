import 'dotenv/config';
import {
	Client,
	GatewayIntentBits,
	SlashCommandBuilder,
	REST,
	Routes,
} from 'discord.js';
import { KeyValueDB } from './KeyValueDB.js';

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

// Store monitoring data in memory
const monitoring = new Map();

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

	if (interaction.commandName === 'monitor') {
		const userToMonitor = interaction.options.getUser('user');
		const phoneNumber = interaction.options.getString('phone-number');

		monitoring.set(userToMonitor.id, interaction.user.id); // Map monitored user ID to caller's user ID
		await monitoredAskerDB.write(userToMonitor.id, [interaction.user.id]); // Write to monitored-asker db
		await askerNumberDB.write(interaction.user.id, [phoneNumber]); // Write to asker-number db

		await interaction.reply({
			content: `You will be notified when ${userToMonitor.tag} joins a voice channel.`,
			ephemeral: true,
		});
	}

	if (interaction.commandName === 'stopmonitor') {
		const userToStopMonitoring = interaction.options.getUser('user');

		if (monitoring.has(userToStopMonitoring.id)) {
			monitoring.delete(userToStopMonitoring.id);
			await monitoredAskerDB.delete(userToStopMonitoring.id); // Delete from monitored-asker db
			await askerNumberDB.delete(interaction.user.id); // Delete from asker-number db

			await interaction.reply({
				content: `You will no longer receive notifications for ${userToStopMonitoring.tag}.`,
				ephemeral: true,
			});
		} else {
			await interaction.reply({
				content: `You are not monitoring ${userToStopMonitoring.tag}.`,
				ephemeral: true,
			});
		}
	}
});

// Bot event: voice state update
client.on('voiceStateUpdate', (oldState, newState) => {
	// Check if the user joined a voice channel
	if (!oldState.channel && newState.channel) {
		const monitoredUserId = newState.id; // The user who triggered the event

		// Check if this user is being monitored
		if (monitoring.has(monitoredUserId)) {
			const notifierUserId = monitoring.get(monitoredUserId);

			// Send a DM to the notifier
			client.users.fetch(notifierUserId).then((notifier) => {
				notifier.send(
					`${newState.member.user.tag} joined the voice channel: ${newState.channel.name}`
				);

				// send text instead
			});
		}
	}
});

client.login(TOKEN);
