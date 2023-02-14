/**
 * @fileoverview Utility for initializing studio.
 * When importing certain files from studio, errors can occur when this
 * causes files with circular references to be loaded in a certain order.
 *
 * Import this file before any other files from studio.
 */

import "../../../../studio/src/studioInstance.js";
