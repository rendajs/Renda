import {ContentWindowAbout} from "./contentWindows/ContentWindowAbout.js";
import {ContentWindowBuildView} from "./contentWindows/ContentWindowBuildView/ContentWindowBuildView.js";
import {ContentWindowBuiltInAssets} from "./contentWindows/ContentWindowBuiltInAssets.js";
import {ContentWindowConnections} from "./contentWindows/ContentWindowConnections.js";
import {ContentWindowDefaultAssetLinks} from "./contentWindows/ContentWindowDefaultAssetLinks.js";
import {ContentWindowEntityEditor} from "./contentWindows/ContentWindowEntityEditor.js";
import {ContentWindowOutliner} from "./contentWindows/ContentWindowOutliner.js";
import {ContentWindowProject} from "./contentWindows/ContentWindowProject.js";
import {ContentWindowProperties} from "./contentWindows/ContentWindowProperties.js";

export const autoRegisterContentWindows = [
	ContentWindowAbout,
	ContentWindowBuildView,
	ContentWindowBuiltInAssets,
	ContentWindowConnections,
	ContentWindowDefaultAssetLinks,
	ContentWindowEntityEditor,
	ContentWindowOutliner,
	ContentWindowProject,
	ContentWindowProperties,
];
