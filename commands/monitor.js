export const monitor = async () => {
	const userToMonitor = interaction.options.getUser('user');
	const phoneNumber = interaction.options.getString('phone-number');

	await monitoredAskerDB.write(userToMonitor.id, [interaction.user.id], true); // Write to monitored-asker db
	await askerNumberDB.write(interaction.user.id, [phoneNumber], false); // Write to asker-number db

	await interaction.reply({
		content: `You will be notified when ${userToMonitor.tag} joins a voice channel.`,
		ephemeral: true,
	});
};
