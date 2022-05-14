import {BuildViewContentWindow} from "./contentWindows/BuildViewContentWindow.js";
import {BuiltInAssetsContentWindow} from "./contentWindows/BuiltInAssetsContentWindow.js";
import {ConnectionsContentWindow} from "./contentWindows/ConnectionsContentWindow.js";
import {DefaultAssetLinksContentWindow} from "./contentWindows/DefaultAssetLinksContentWindow.js";
import {EntityEditorContentWindow} from "./contentWindows/EntityEditorContentWindow.js";
import {OutlinerContentWindow} from "./contentWindows/OutlinerContentWindow.js";
import {ProjectContentWindow} from "./contentWindows/ProjectContentWindow.js";
import {PropertiesContentWindow} from "./contentWindows/PropertiesContentWindow.js";

export const autoRegisterContentWindows = [
	BuildViewContentWindow,
	BuiltInAssetsContentWindow,
	ConnectionsContentWindow,
	DefaultAssetLinksContentWindow,
	EntityEditorContentWindow,
	OutlinerContentWindow,
	ProjectContentWindow,
	PropertiesContentWindow,
];
