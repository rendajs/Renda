import { PropertiesTreeView } from "../../ui/propertiesTreeView/PropertiesTreeView.js";
import { ContentWindow } from "./ContentWindow.js";

/**
 * @typedef {object} ConectionGui
 * @property {PropertiesTreeView<any>} treeView
 * @property {import("../../ui/propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntry<import("../../ui/LabelGui.js").LabelGui>} statusLabel
 * @property {import("../../ui/propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntry<import("../../ui/Button.js").Button>?} connectButton
 * @property {import("../../ui/propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntry<import("../../ui/Button.js").Button>?} allowButton
 * @property {import("../../ui/propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntry<import("../../ui/Button.js").Button>?} blockButton
 */

export class ContentWindowConnections extends ContentWindow {
	static contentWindowTypeId = /** @type {const} */ ("renda:connections");
	static contentWindowUiName = "Connections";
	static contentWindowUiIcon = "static/icons/remoteSignal.svg";

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		this.addPreferencesButton([
			"studioConnections.enableRemoteDiscovery",
			"studioConnections.enableInternalDiscovery",
		]);

		this.headerTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(this.headerTreeView.el);

		this.studioConnectionGuis = new Map();
		this.inspectorConnectionGuis = new Map();

		const { discoveryServerStatusLabel } = this.createHeaderUi();
		this.discoveryServerStatusLabel = discoveryServerStatusLabel;

		const { studioClientConnectionTreeView, studioConnectionsList } = this.createClientConnectionUi();
		this.studioClientConnectionsTreeView = studioClientConnectionTreeView;
		this.studioConnectionsList = studioConnectionsList;

		const { inspectorConnectionsList, inspectorConnectionsTreeView } = this.createInspectorConnectionsUi();
		this.inspectorConnectionsTreeView = inspectorConnectionsTreeView;
		this.inspectorConnectionsList = inspectorConnectionsList;

		const connectionsManager = this.studioInstance.studioConnectionsManager;
		connectionsManager.onWebRtcDiscoveryServerStatusChange(this.#updateWebRtcDiscoveryServerStatus);

		connectionsManager.onConnectionsChanged(this.#updateConnectionLists);

		this.#updateWebRtcDiscoveryServerStatus(connectionsManager.webRtcDiscoveryServerStatus);

		this.#updateConnectionLists();
	}

	destructor() {
		const connectionsManager = this.studioInstance.studioConnectionsManager;
		connectionsManager.removeOnWebRtcDiscoveryServerStatusChange(this.#updateWebRtcDiscoveryServerStatus);
		connectionsManager.removeOnConnectionsChanged(this.#updateConnectionLists);
	}

	createHeaderUi() {
		const discoveryServerEndpointField = this.headerTreeView.addItem({
			type: "string",
			/** @type {import("../../ui/TextGui.js").TextGuiOptions} */
			guiOpts: {
				label: "Discovery Server",
				placeholder: this.studioInstance.studioConnectionsManager.getDefaultWebRtcDiscoveryEndpoint(),
			},
		});
		discoveryServerEndpointField.onValueChange((changeEvent) => {
			this.studioInstance.studioConnectionsManager.setWebRtcDiscoveryEndpoint(changeEvent.value);
		});
		const discoveryServerStatusLabel = this.headerTreeView.addItem({
			type: "label",
			guiOpts: {
				label: "Status",
			},
		});
		return { discoveryServerStatusLabel };
	}

	createClientConnectionUi() {
		const studioClientConnectionTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(studioClientConnectionTreeView.el);

		const studioConnectionsList = studioClientConnectionTreeView.addCollapsable("Studios");
		return { studioClientConnectionTreeView, studioConnectionsList };
	}

	createInspectorConnectionsUi() {
		const inspectorConnectionsTreeView = new PropertiesTreeView();
		this.contentEl.appendChild(inspectorConnectionsTreeView.el);

		const inspectorConnectionsList = inspectorConnectionsTreeView.addCollapsable("Inspectors");
		return { inspectorConnectionsList, inspectorConnectionsTreeView };
	}

	/**
	 * @param {import("../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").DiscoveryServerStatusType} status
	 */
	#updateWebRtcDiscoveryServerStatus = (status) => {
		this.discoveryServerStatusLabel.setValue(status);
	};

	#updateConnectionLists = () => {
		const connections = Array.from(this.studioInstance.studioConnectionsManager.getConnections());
		this.updateConnectionsList(this.studioConnectionGuis, this.studioConnectionsList, connections, ["studio-host", "studio-client"]);
		this.updateConnectionsList(this.inspectorConnectionGuis, this.inspectorConnectionsList, connections, ["inspector"]);
	};

	/**
	 * @param {Map<string, ConectionGui>} guisList
	 * @param {PropertiesTreeView<any>} listTreeView
	 * @param {import("../../network/studioConnections/StudioConnectionsManager.js").StudioConnectionData[]} connections
	 * @param {import("../../../../src/network/studioConnections/DiscoveryManager.js").ClientType[]} allowedClientTypes
	 */
	updateConnectionsList(guisList, listTreeView, connections, allowedClientTypes) {
		const removeGuiIds = new Set(guisList.keys());
		for (const connection of connections) {
			if (!allowedClientTypes.includes(connection.clientType)) continue;

			let gui = guisList.get(connection.id);
			if (!gui) {
				const treeView = listTreeView.addCollapsable();
				treeView.renderContainer = true;
				const connectionTypeLabel = treeView.addItem({
					type: "label",
					guiOpts: {
						label: "Connection Type",
						showLabelBackground: false,
					},
				});
				if (connection.connectionType == "renda:internal") {
					connectionTypeLabel.setValue("Internal");
				} else if (connection.connectionType == "renda:webrtc") {
					connectionTypeLabel.setValue("WebRTC");
				} else {
					connectionTypeLabel.setValue(connection.connectionType);
				}
				const statusLabel = treeView.addItem({
					type: "label",
					guiOpts: {
						label: "Status",
					},
				});

				gui = { treeView, statusLabel, connectButton: null, blockButton: null, allowButton: null };
				guisList.set(connection.id, gui);
			}

			removeGuiIds.delete(connection.id);

			const projectMetadata = connection.projectMetadata;

			let available = false;
			let status = "Unavailable";
			let tooltip = "";
			if (connection.clientType == "studio-client") {
				tooltip = "This connection is a studio instance without an open project. Connections can only be initiated from the other end.";
				gui.treeView.name = "Studio Client";
			} else if (connection.clientType == "inspector") {
				available = true;
				gui.treeView.name = "Inspector";
				status = "Available";
			} else if (projectMetadata) {
				gui.treeView.name = projectMetadata.name || "Untitled Project";
				if (projectMetadata.fileSystemHasWritePermissions) {
					available = true;
					status = "Available";
				} else {
					status = "No Filesystem permissions";
					tooltip = "The other studio instance hasn't approved file system permissions in its tab yet.";
				}
			} else {
				gui.treeView.name = "Studio";
				tooltip = "The other studio instance either doesn't have a project open or has disabled incoming connections in its connections window.";
			}

			let connectButtonVisible = false;
			let connectButtonEnabled = false;
			let permissionButtonsVisible = false;
			if (connection.connectionState == "connecting") {
				status = "Connecting";
				connectButtonVisible = true;
				connectButtonEnabled = false;
			} else if (connection.connectionState == "outgoing-permission-pending") {
				status = "Waiting for Permission";
				connectButtonVisible = true;
				connectButtonEnabled = false;
				tooltip = "Waiting for the receiving end to allow the request.";
			} else if (connection.connectionState == "incoming-permission-pending") {
				status = "Waiting for Permission";
				permissionButtonsVisible = true;
			} else if (connection.connectionState == "connected") {
				status = "Connected";
			} else if (available) {
				if (connection.connectionState == "outgoing-permission-rejected") {
					status = "Permission Denied";
					tooltip = "The receiving end blocked the request, but you may try again.";
				}
				connectButtonVisible = true;
				connectButtonEnabled = true;
			}
			gui.statusLabel.setValue(status);
			gui.statusLabel.gui.tooltip = tooltip;

			if (connectButtonVisible) {
				if (!gui.connectButton) {
					gui.connectButton = gui.treeView.addItem({
						type: "button",
						guiOpts: {
							label: "Connect",
							text: "Connect",
							onClick: () => {
								this.studioInstance.studioConnectionsManager.requestConnection(connection.id);
							},
						},
					});
				}
			} else {
				if (gui.connectButton) {
					gui.treeView.removeChild(gui.connectButton);
					gui.connectButton = null;
				}
			}
			if (gui.connectButton) {
				gui.connectButton.setDisabled(!connectButtonEnabled);
			}

			if (permissionButtonsVisible) {
				if (!gui.blockButton) {
					gui.blockButton = gui.treeView.addItem({
						type: "button",
						guiOpts: {
							hideLabel: true,
							text: "Block",
							onClick: () => {
								this.studioInstance.studioConnectionsManager.rejectIncomingConnection(connection.id);
							},
						},
					});
				}
				if (!gui.allowButton) {
					gui.allowButton = gui.treeView.addItem({
						type: "button",
						guiOpts: {
							hideLabel: true,
							text: "Allow",
							onClick: () => {
								this.studioInstance.studioConnectionsManager.acceptIncomingConnection(connection.id);
							},
						},
					});
				}
			} else {
				if (gui.blockButton) {
					gui.treeView.removeChild(gui.blockButton);
					gui.blockButton = null;
				}
				if (gui.allowButton) {
					gui.treeView.removeChild(gui.allowButton);
					gui.allowButton = null;
				}
			}
		}

		for (const removeGuiId of removeGuiIds) {
			const gui = guisList.get(removeGuiId);
			if (gui) {
				listTreeView.removeChild(gui.treeView);
			}
			guisList.delete(removeGuiId);
		}
	}
}
