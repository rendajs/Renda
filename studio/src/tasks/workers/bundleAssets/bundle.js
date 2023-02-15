import {uuidToBinary} from "../../../../../src/mod.js";

/**
 * @param {import("../../../../../src/mod.js").UuidString[]} assetUuids
 * @param {number} fileStreamId
 * @param {import("./mod.js").BundleScriptsMessenger} messenger
 */
export async function bundle(assetUuids, fileStreamId, messenger) {
	const assetHeaderByteLength = 16 + 16 + 4; // 16 bytes for the uuid + 16 bytes for the asset type uuid + 4 bytes for the asset length
	const headerByteLength = 4 + assetUuids.length * assetHeaderByteLength; // 4 bytes for the asset count + the asset headers
	const useFileStream = fileStreamId >= 0;

	// fill header with zeros
	const emptyHeader = new ArrayBuffer(headerByteLength);
	if (useFileStream) {
		await messenger.sendWithTransfer.writeFile([emptyHeader], fileStreamId, emptyHeader);
	}

	const header = new ArrayBuffer(headerByteLength);
	const headerIntView = new Uint8Array(header);
	const headerView = new DataView(header);

	let headerCursor = 0;
	headerView.setUint32(headerCursor, assetUuids.length, true);
	headerCursor += 4;

	/**
	 * The Buffers that will be concatenated in case `useFileStream` is false.
	 * @type {ArrayBuffer[]}
	 */
	const assetBuffers = [];
	const textEncoder = new TextEncoder();

	for (const assetUuid of assetUuids) {
		// TODO: This makes using a worker kind of pointless, since this is the
		// heaviest part of the bundle process.
		// We should move this over to the worker, but this requires some kind
		// of api that allows ProjectAssetTypes to include a function that can
		// be transfered to this worker.
		const assetDataResult = await messenger.send.getBundledAssetData(assetUuid);
		if (!assetDataResult) continue;

		const {assetData, assetTypeUuid} = assetDataResult;

		const binaryUuid = uuidToBinary(assetUuid);
		headerIntView.set(new Uint8Array(binaryUuid), headerCursor);
		headerCursor += 16;

		const binaryAssetTypeUuid = uuidToBinary(assetTypeUuid);
		headerIntView.set(new Uint8Array(binaryAssetTypeUuid), headerCursor);
		headerCursor += 16;

		let dataSizeBytes = 0;
		if (assetData instanceof ArrayBuffer) {
			dataSizeBytes = assetData.byteLength;
		} else {
			dataSizeBytes = assetData.length;
		}
		headerView.setUint32(headerCursor, dataSizeBytes, true);
		headerCursor += 4;

		/** @type {Transferable[]} */
		const transfer = [];
		if (typeof assetData != "string") {
			transfer.push(assetData);
		}
		if (useFileStream) {
			await messenger.sendWithTransfer.writeFile([], fileStreamId, assetData);
		} else {
			let buffer;
			if (typeof assetData == "string") {
				buffer = textEncoder.encode(assetData).buffer;
			} else {
				buffer = assetData;
			}
			assetBuffers.push(buffer);
		}
	}

	let returnValue = null;
	if (useFileStream) {
		await messenger.sendWithTransfer.writeFile([header], fileStreamId, {
			type: "write",
			position: 0,
			data: header,
		});
		await messenger.send.closeFile(fileStreamId);
	} else {
		let totalBufferLength = header.byteLength;
		for (const buffer of assetBuffers) {
			totalBufferLength += buffer.byteLength;
		}
		const view = new Uint8Array(totalBufferLength);
		view.set(new Uint8Array(header));
		let offset = header.byteLength;
		for (const buffer of assetBuffers) {
			view.set(new Uint8Array(buffer), offset);
			offset += buffer.byteLength;
		}
		returnValue = view.buffer;
	}
	return {
		returnValue,
	};
}
