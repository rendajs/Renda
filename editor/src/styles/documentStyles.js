// Eslint isn't able to handle import assertion syntax yet. So for now we will
// combine all imports in this file. Perhaps in the future we might be able to
// import styles from files related to the elements using the styles.

// @ts-ignore
import mainSheet from "./styles.css" assert {type: "css"};
// @ts-ignore
import variables from "./variables.css" assert {type: "css"};
// @ts-ignore
import zIndex from "./zIndex.css" assert {type: "css"};
// @ts-ignore
import projectSelector from "../projectSelector/projectSelector.css" assert {type: "css"};
// @ts-ignore
import windowManagement from "../windowManagement/windowManagement.css" assert {type: "css"};
// @ts-ignore
import contentWindowAbout from "../windowManagement/contentWindows/ContentWindowAbout.css" assert {type: "css"};
// @ts-ignore
import popoverMenus from "../ui/popoverMenus/popoverMenus.css" assert {type: "css"};
// @ts-ignore
import guis from "../ui/guis.css" assert {type: "css"};
// @ts-ignore
import treeView from "../ui/treeView.css" assert {type: "css"};

document.adoptedStyleSheets = [
	mainSheet,
	variables,
	zIndex,
	projectSelector,
	windowManagement,
	contentWindowAbout,
	popoverMenus,
	guis,
	treeView,
];
