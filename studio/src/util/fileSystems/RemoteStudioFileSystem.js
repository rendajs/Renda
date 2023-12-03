import {StudioFileSystem} from "./StudioFileSystem.js";

export class RemoteStudioFileSystem extends StudioFileSystem {
	/** @type {import("../../network/studioConnections/handlers.js").StudioClientHostConnection?} */
	#connection = null;
	#connected = false;
	/** @type {Set<() => void>} */
	#onConnectedCbs = new Set();

	/**
	 * @param {import("../../network/studioConnections/handlers.js").StudioClientHostConnection} connection
	 */
	setConnection(connection) {
		if (this.#connection) {
			throw new Error("A connection has already been assigned to this file system.");
		}
		this.#connection = connection;
		this.#updateConnected();
	}

	#updateConnected() {
		const connected = Boolean(this.#connection);
		if (connected != this.#connected) {
			this.#connected = connected;
			if (connected) {
				this.#onConnectedCbs.forEach(cb => cb());
			}
		}
	}

	async #waitForConnection() {
		if (this.#connected && this.#connection) return this.#connection;
		/** @type {Promise<void>} */
		const promise = new Promise(r => this.#onConnectedCbs.add(r));
		await promise;
		if (!this.#connection) throw new Error("Assertion failed: Connection doesn't exist.");
		return this.#connection;
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 */
	async readDir(path) {
		path = [...path];
		const connection = await this.#waitForConnection();
		return await connection.messenger.send["fileSystem.readDir"](path);
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 * @returns {Promise<void>}
	 */
	async createDir(path) {
		path = [...path];
		const connection = await this.#waitForConnection();
		return await connection.messenger.send["fileSystem.createDir"](path);
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 * @returns {Promise<File>}
	 */
	async readFile(path) {
		path = [...path];
		const connection = await this.#waitForConnection();
		return await connection.messenger.send["fileSystem.readFile"](path);
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 * @returns {Promise<boolean>}
	 */
	async isFile(path) {
		path = [...path];
		const connection = await this.#waitForConnection();
		return await connection.messenger.send["fileSystem.isFile"](path);
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 * @returns {Promise<boolean>}
	 */
	async isDir(path) {
		path = [...path];
		const connection = await this.#waitForConnection();
		return await connection.messenger.send["fileSystem.isDir"](path);
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 * @returns {Promise<boolean>}
	 */
	async exists(path) {
		path = [...path];
		const connection = await this.#waitForConnection();
		return await connection.messenger.send["fileSystem.exists"](path);
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 * @param {import("./StudioFileSystem.js").AllowedWriteFileTypes} file
	 */
	async writeFile(path, file) {
		path = [...path];
		const connection = await this.#waitForConnection();
		return await connection.messenger.send["fileSystem.writeFile"](path, file);
	}
}
