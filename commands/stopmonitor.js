export const stopmonitor = async () => {
	const userToStopMonitoring = interaction.options.getUser('user'); //i want to stop monitoring this person
	const monitors = await monitoredAskerDB.read(userToStopMonitoring.id); //checking if that person has monitors

	//does the monitors array include the person asking to be removed
	if (monitors && monitors.includes(interaction.user.id)) {
		await monitoredAskerDB.deleteMonitor(
			userToStopMonitoring.id,
			interaction.user.id
		); // Delete from monitored-asker db

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
};
