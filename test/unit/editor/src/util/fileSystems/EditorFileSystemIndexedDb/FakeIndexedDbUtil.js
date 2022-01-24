/** @type {Map<string, Database>} */
const databases = new Map();

class Database {

}

export class FakeIndexedDbUtil {
	/** @type {Database} */
	#db;

	constructor(dbName = "keyValuesDb", {
		objectStoreNames = ["keyValues"],
		enableLocalStorageFallback = false,
	} = {}) {
		this.#db = new Database();
		databases.set(dbName, this.#db);
	}

	get() {

	}

	set() {

	}

	deleteDb() {

	}
}
