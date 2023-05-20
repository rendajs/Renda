import {StudioConnection} from "../../../../../../studio/src/network/studioConnections/StudioConnection.js";
import {assertIsType, testTypes} from "../../../../shared/typeAssertions.js";

function createConnection() {
	const messageHandler = /** @type {import("../../../../../../studio/src/network/studioConnections/messageHandlers/MessageHandler.js").MessageHandler} */ ({});
	const protocolManager = /** @type {import("../../../../../../studio/src/network/studioConnections/ProtocolManager.js").ProtocolManager} */ ({});
	const connection = new StudioConnection(messageHandler, protocolManager);
	return connection;
}

testTypes({
	name: "call() has the correct argument and return types",
	async fn() {
		const connection = createConnection();
		const result = await connection.call("fileSystem.isDir", ["path"]);

		// Verify that the result is a boolean
		assertIsType(true, result);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType("", result);

		// @ts-expect-error called with too many arguments
		await connection.call("fileSystem.isDir", ["path"], true);
		// @ts-expect-error called with too few arguments
		await connection.call("fileSystem.isDir");
		// @ts-expect-error called with incorrect argument type
		await connection.call("fileSystem.isDir", [false]);
	},
});
