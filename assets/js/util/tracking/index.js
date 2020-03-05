/**
 * Event tracking utilities.
 *
 * Site Kit by Google, Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Internal dependencies
 */
import createTracking from './createTracking';
import { initialConfig } from './index.private';

const {
	enableTracking,
	disableTracking,
	isTrackingEnabled,
	trackEvent,
} = createTracking( initialConfig );

/**
 * Change the active state of tracking.
 *
 * @param {boolean} activeStatus The new state to set.
 */
function toggleTracking( activeStatus ) {
	if ( !! activeStatus ) {
		enableTracking();
	} else {
		disableTracking();
	}
}

// Bootstrap on import.
toggleTracking( isTrackingEnabled() );

export {
	enableTracking,
	disableTracking,
	isTrackingEnabled,
	toggleTracking,
	trackEvent,
};
