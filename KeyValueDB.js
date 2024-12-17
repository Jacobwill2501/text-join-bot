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
			const [key, value] = line.split(','); // Split on commas instead of equals sign
			keyValueStore[key] = value ? value.split(',') : []; // Handle arrays correctly
		});

		return keyValueStore;
	}

	// Helper: Save key-value pairs from an object into the file
	async _saveFile(keyValueStore) {
		const content = Object.entries(keyValueStore)
			.map(([key, value]) => `${key},${value.join(',')}`) // Use commas instead of equals sign
			.join('\n');
		await fs.writeFile(this.filePath, content, 'utf8');
	}

	// Create or Update: Write key-value pair (merge arrays if key exists)
	async write(key, value) {
		if (!Array.isArray(value)) {
			throw new Error('The value must be an array.');
		}

		const keyValueStore = await this._loadFile();

		// Step 1: Check if the value is already present in any other key's array
		const valueExistsInAnotherKey = Object.values(keyValueStore).some(
			(existingValueArray) => existingValueArray.includes(value[0]) // Check if the first value exists in any array
		);

		if (valueExistsInAnotherKey) {
			// If the value exists in any other key, don't modify the original key's array, just create a new key
			console.log(
				`Value "${value[0]}" already exists in another key. Adding as new key.`
			);
			keyValueStore[key] = value; // Add new key-value pair
		} else {
			// Step 2: If the key exists, merge arrays without duplicates
			if (keyValueStore[key]) {
				const mergedArray = Array.from(
					new Set([...keyValueStore[key], ...value]) // Merge arrays and remove duplicates
				);
				keyValueStore[key] = mergedArray;
			} else {
				keyValueStore[key] = value; // Create a new key-value pair
			}
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
}
