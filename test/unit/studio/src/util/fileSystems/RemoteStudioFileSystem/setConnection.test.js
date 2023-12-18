import {assertEquals, assertThrows} from "std/testing/asserts.ts";
import {RemoteStudioFileSystem} from "../../../../../../../studio/src/util/fileSystems/RemoteStudioFileSystem.js";
import {assertPromiseResolved} from "../../../../../shared/asserts.js";

Deno.test({
	name: "setConnection() may only be called once",
	fn() {
		const fs = new RemoteStudioFileSystem();
		const castConnection = /** @type {import("../../../../../../../src/network/studioConnections/StudioConnection.js").StudioConnection<any, any>} */ ({
			onStatusChange(cb) {},
		});
		fs.setConnection(castConnection);

		assertThrows(() => {
			fs.setConnection(castConnection);
		}, Error, "A connection has already been assigned to this file system.");
	},
});

Deno.test({
	name: "Calls stay pending until a connection is made",
	async fn() {
		const fs = new RemoteStudioFileSystem();
		const promise = fs.isFile(["path", "to", "file"]);

		await assertPromiseResolved(promise, false);

		/** @type {import("../../../../../../../src/network/studioConnections/messageHandlers/MessageHandler.js").OnStatusChangeCallback} */
		let onStatusChangeCb = () => {};

		const connection = {
			messenger: {
				send: {
					/**
					 * @param {string[]} path
					 */
					"fileSystem.isFile": async path => {
						return true;
					},
				},
			},
			status: /** @type {import("../../../../../../../src/network/studioConnections/messageHandlers/MessageHandler.js").MessageHandlerStatus} */ ("connecting"),
			/**
			 * @param {import("../../../../../../../src/network/studioConnections/messageHandlers/MessageHandler.js").OnStatusChangeCallback} cb
			 */
			onStatusChange(cb) {
				onStatusChangeCb = cb;
			},
		};

		const castConnection = /** @type {import("../../../../../../../src/network/studioConnections/StudioConnection.js").StudioConnection<any, any>} */ (/** @type {unknown} */ (connection));
		fs.setConnection(castConnection);

		await assertPromiseResolved(promise, false);

		connection.status = "outgoing-permission-pending";
		onStatusChangeCb("outgoing-permission-pending");

		connection.status = "connected";
		onStatusChangeCb("connected");

		await assertPromiseResolved(promise, true);
		assertEquals(await promise, true);
	},
});
