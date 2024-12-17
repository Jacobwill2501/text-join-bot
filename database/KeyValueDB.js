import { promises as fs } from 'fs';

export class KeyValueDB {
	constructor(filePath) {
		this.filePath = filePath;
	}

	// Helper: Load key-value pairs from file into an object
	async _loadFile() {
		let fileContent = '';
		try {
			fileContent = await fs.readFile(this.filePath, 'utf8');
		} catch (err) {
			if (err.code === 'ENOENT') {
				// File does not exist, return empty store
				return {};
			}
			throw err; // Rethrow other errors
		}

		const lines = fileContent.split('\n').filter((line) => line.trim() !== '');
		const keyValueStore = {};

		lines.forEach((line) => {
			const key = line.substring(0, line.indexOf(','));
			const value = line.substring(line.indexOf(',') + 1).split(',');
			keyValueStore[key] = value ?? [];
		});

		return keyValueStore;
	}

	// Helper: Save key-value pairs from an object into the file
	async _saveFile(keyValueStore) {
		const content = Object.entries(keyValueStore)
			.map(([key, value]) => `${key},${value.join(',')}`) // Use commas
			.join('\n');
		await fs.writeFile(this.filePath, content, 'utf8');
	}

	// Create or Update: Write key-value pair (merge arrays if key exists)
	async write(key, value, mergeArray) {
		if (!Array.isArray(value)) {
			throw new Error('The value must be an array.');
		}

		const keyValueStore = await this._loadFile();

		// Step 1: If the key exists, merge arrays without duplicates
		if (keyValueStore[key] && mergeArray) {
			const mergedArray = Array.from(
				new Set([...keyValueStore[key], ...value]) // Merge arrays and remove duplicates
			);
			keyValueStore[key] = mergedArray;
		} else {
			keyValueStore[key] = value; // Create a new key-value pair
		}

		await this._saveFile(keyValueStore);
		console.log(`Key "${key}" added or updated successfully.`);
	}

	// Read: Get the array value for a specific key
	async read(key) {
		const keyValueStore = await this._loadFile();
		return keyValueStore[key] || null; // Return the array or null if not found
	}

	// Update: Replace the array value for a specific key
	async update(key, value) {
		if (!Array.isArray(value)) {
			throw new Error('The value must be an array.');
		}

		const keyValueStore = await this._loadFile();

		if (!keyValueStore[key]) {
			console.log(`Key "${key}" does not exist.`);
			return;
		}

		keyValueStore[key] = value; // Replace the array
		await this._saveFile(keyValueStore);
		console.log(`Key "${key}" updated successfully.`);
	}

	// Delete: Remove a specific key-value pair
	async delete(key) {
		const keyValueStore = await this._loadFile();

		if (!keyValueStore[key]) {
			console.log(`Key "${key}" does not exist.`);
			return;
		}

		delete keyValueStore[key];
		await this._saveFile(keyValueStore);
		console.log(`Key "${key}" deleted successfully.`);
	}

	// Delete the monitor for a specific key
	async deleteMonitor(key, monitorToRemove) {
		const keyValueStore = await this._loadFile();

		// If the key doesn't exist in the store, nothing to remove
		if (!keyValueStore[key]) {
			console.log(`Key "${key}" not found.`);
			return;
		}

		let monitors = keyValueStore[key];

		// Remove the monitor from the list
		monitors = monitors.filter((monitor) => monitor !== monitorToRemove);

		// If no monitors are left, delete the key entirely
		if (monitors.length === 0) {
			delete keyValueStore[key];
		} else {
			// Otherwise, update the key with the remaining monitors
			keyValueStore[key] = monitors;
		}

		// Save the updated data back to the file
		await this._saveFile(keyValueStore);
		console.log(`Monitor "${monitorToRemove}" removed successfully.`);
	}
}
