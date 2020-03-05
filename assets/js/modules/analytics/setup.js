/**
 * AnalyticsSetup component.
 *
 * Site Kit by Google, Copyright 2019 Google LLC
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
 * External dependencies
 */
import data, { TYPE_MODULES } from 'GoogleComponents/data';
import PropTypes from 'prop-types';
import Button from 'GoogleComponents/button';
import ProgressBar from 'GoogleComponents/progress-bar';
import Link from 'GoogleComponents/link';
import Radio from 'GoogleComponents/radio';
import Switch from 'GoogleComponents/switch';
import { Select, Option } from 'SiteKitCore/material-components';
import SvgIcon from 'GoogleUtil/svg-icon';
import {
	trackEvent,
	getExistingTag,
	toggleConfirmModuleSettings,
} from 'GoogleUtil';
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { __, _x, sprintf } from '@wordpress/i18n';
import { Component, Fragment } from '@wordpress/element';
import { addFilter, removeFilter } from '@wordpress/hooks';

const TRACKING_LOGGED_IN_USERS = 'loggedinUsers';

const trackingExclusionLabels = {
	[ TRACKING_LOGGED_IN_USERS ]: __( 'Logged-in users', 'google-site-kit' ),
};

class AnalyticsSetup extends Component {
	constructor( props ) {
		super( props );
		const {
			accountID,
			anonymizeIP,
			internalWebPropertyID,
			profileID,
			propertyID,
			useSnippet,
			ampClientIDOptIn,
			trackingDisabled,
		} = global.googlesitekit.modules.analytics.settings;

		this.state = {
			anonymizeIP,
			isLoading: true,
			isSaving: false,
			propertiesLoading: false,
			profilesLoading: false,
			useSnippet: useSnippet || false,
			errorCode: false,
			errorMsg: '',
			errorReason: false,
			accounts: [],
			properties: [],
			profiles: [],
			selectedAccount: accountID,
			selectedProperty: propertyID,
			selectedProfile: profileID,
			selectedinternalWebProperty: internalWebPropertyID,
			ampClientIDOptIn,
			existingTag: false,
			trackingDisabled: trackingDisabled || [],
		};

		this.handleAccountChange = this.handleAccountChange.bind( this );
		this.handlePropertyChange = this.handlePropertyChange.bind( this );
		this.handleProfileChange = this.handleProfileChange.bind( this );
		this.processAccountChange = this.processAccountChange.bind( this );
		this.processPropertyChange = this.processPropertyChange.bind( this );
		this.handleSubmit = this.handleSubmit.bind( this );
		this.handleRadioClick = this.handleRadioClick.bind( this );
		this.handleRefetchAccount = this.handleRefetchAccount.bind( this );
		this.handleExclusionsChange = this.handleExclusionsChange.bind( this );
		this.switchStatus = this.switchStatus.bind( this );
	}

	async componentDidMount() {
		const {
			isOpen,
			onSettingsPage,
		} = this.props;
		this._isMounted = true;

		// If on settings page, only run the rest if the module is "open".
		if ( onSettingsPage && ! isOpen ) {
			return;
		}

		const existingTagProperty = await getExistingTag( 'analytics' );

		if ( existingTagProperty && existingTagProperty.length ) {
			// Verify the user has access to existing tag if found. If no access request will return 403 error and catch err.
			try {
				const existingTagData = await data.get( TYPE_MODULES, 'analytics', 'tag-permission', { tag: existingTagProperty } );
				await this.getAccounts( existingTagData );
			} catch ( err ) {
				this.setState(
					{
						isLoading: false,
						errorCode: err.code,
						errorMsg: err.message,
						errorReason: err.data && err.data.reason ? err.data.reason : false,
					}
				);
			}
		} else {
			await this.getAccounts();
		}

		// Handle save hook from the settings page.
		addFilter( 'googlekit.SettingsConfirmed',
			'googlekit.AnalyticsSettingsConfirmed',
			( chain, module ) => {
				if ( 'analytics' !== module.replace( '-module', '' ) ) {
					return chain;
				}
				const { isEditing } = this.props;
				if ( isEditing ) {
					return this.handleSubmit();
				}
			} );
	}

	componentWillUnmount() {
		this._isMounted = false;

		removeFilter( 'googlekit.SettingsConfirmed', 'googlekit.AnalyticsSettingsConfirmed' );
	}

	componentDidUpdate() {
		this.toggleConfirmChangesButton();
	}

	/**
	 * Toggle confirm changes button disable/enabble depending on the changed settings.
	 */
	toggleConfirmChangesButton() {
		if ( ! this.props.isEditing ) {
			return;
		}

		let settingsMapping = {
			anonymizeIP: 'anonymizeIP',
			selectedAccount: 'accountID',
			selectedProperty: 'propertyID',
			selectedProfile: 'profileID',
			selectedinternalWebProperty: 'internalWebPropertyID',
			useSnippet: 'useSnippet',
			ampClientIDOptIn: 'ampClientIDOptIn',
			trackingDisabled: 'trackingDisabled',
		};

		// Prevent saving if "setup account" is chosen.
		if ( '-1' === this.state.selectedAccount ) {
			settingsMapping = {};
		}

		toggleConfirmModuleSettings( 'analytics', settingsMapping, this.state );
	}

	handleAccountChange( index, item ) {
		const { selectedAccount } = this.state;
		const selectValue = item.dataset.value;

		if ( selectValue === selectedAccount ) {
			return;
		}

		// The selected value is string.
		if ( '0' === selectValue ) {
			this.setState( {
				selectedAccount: selectValue,
				selectedProperty: '-1',
				selectedProfile: '-1',
				properties: [ {
					id: '-1',
					name: __( 'Select an account', 'google-site-kit' ),
				} ],
				profiles: [ {
					id: '-1',
					name: __( 'Select an account', 'google-site-kit' ),
				} ],
			} );
			return;
		}

		this.setState( {
			propertiesLoading: true,
			profilesLoading: true,
			selectedAccount: selectValue,
		} );

		// Track selection.
		trackEvent( 'analytics_setup', 'account_change', selectValue );

		// Don't query accounts if "setup a new account" was chosen.
		if ( '-1' !== selectValue ) {
			this.processAccountChange( selectValue );
		}
	}

	handlePropertyChange( index, item ) {
		const { selectedProperty } = this.state;
		const selectValue = item.dataset.value;

		if ( selectValue === selectedProperty ) {
			return;
		}

		// The selected value is string.
		if ( '0' === selectValue ) {
			this.setState( {
				selectedProperty: selectValue,
				selectedProfile: selectValue,
				profiles: [ {
					id: 0,
					name: __( 'Setup a New Profile', 'google-site-kit' ),
				} ],
			} );
			return;
		}

		this.setState( {
			profilesLoading: true,
			selectedProperty: selectValue,
		} );

		// Track selection.
		trackEvent( 'analytics_setup', 'property_change', selectValue );

		this.processPropertyChange( selectValue );
	}

	handleProfileChange( index, item ) {
		const selectValue = item.dataset.value;

		this.setState( {
			selectedProfile: selectValue,
		} );

		// Track selection.
		trackEvent( 'analytics_setup', 'profile_change', selectValue );
	}

	async getAccounts( existingTagData = false ) {
		let {
			selectedAccount,
			selectedProperty,
			selectedProfile,
			useSnippet,
		} = this.state;
		const {
			isEditing,
			onSettingsPage,
		} = this.props;
		const {
			errorCode,
		} = this.state;
		let newState = {};

		try {
			// Send existing tag data to get account.
			const queryArgs = existingTagData ? {
				existingAccountID: existingTagData.accountID,
				existingPropertyID: existingTagData.propertyID,
			} : {};

			const responseData = await data.get( TYPE_MODULES, 'analytics', 'accounts-properties-profiles', queryArgs );
			if ( 0 === responseData.accounts.length ) {
				newState = {
					...newState,
					errorCode: 'no_account',
					errorReason: 'noAccount',
				};

				// clear the cache.
				data.invalidateCacheGroup( TYPE_MODULES, 'analytics', 'accounts-properties-profiles' );
			} else if ( ! selectedAccount ) {
				let matchedProperty = null;
				if ( responseData.matchedProperty ) {
					matchedProperty = responseData.matchedProperty;
				}

				if ( matchedProperty ) {
					selectedAccount = matchedProperty.accountId; // Capitalization rule exception: `accountId` is a property of an API returned value.
					selectedProperty = matchedProperty.id;
					const matchedProfile = responseData.profiles.find( ( profile ) => {
						return profile.accountId === selectedAccount; // Capitalization rule exception: `accountId` is a property of an API returned value.
					} );
					if ( matchedProfile ) {
						selectedProfile = matchedProfile.id;
					}
				} else {
					responseData.accounts.unshift( {
						id: 0,
						name: __( 'Select one...', 'google-site-kit' ),
					} );
				}
			} else if ( '0' === selectedAccount ) {
				// Accounts were just refreshed.
				responseData.accounts.unshift( {
					id: 0,
					name: __( 'Select one...', 'google-site-kit' ),
				} );
			} else if ( selectedAccount && ! responseData.accounts.find( ( account ) => account.id === selectedAccount ) ) {
				data.invalidateCacheGroup( TYPE_MODULES, 'analytics', 'accounts-properties-profiles' );

				responseData.accounts.unshift( {
					id: 0,
					name: __( 'Select one...', 'google-site-kit' ),
				} );

				if ( isEditing ) {
					selectedAccount = '0';
					selectedProperty = '-1';
					selectedProfile = '-1';
				}

				newState = {
					...newState,
					errorCode: 'insufficient_permissions',
					errorReason: 'insufficientPermissions',
				};
			}

			const chooseAccount = {
				id: '-1',
				name: __( 'Select an account', 'google-site-kit' ),
			};

			if ( ! this.state.existingTag ) {
				responseData.properties.push( {
					id: 0,
					name: __( 'Setup a New Property', 'google-site-kit' ),
				} );
			}

			responseData.profiles.push( {
				id: 0,
				name: __( 'Setup a New Profile', 'google-site-kit' ),
			} );

			// Ensure snippet is inserted while setting up the module unless there is an existing tag.
			if ( ! onSettingsPage ) {
				useSnippet = existingTagData ? false : true;
			}

			newState = {
				...newState,
				isLoading: false,
				accounts: responseData.accounts,
				errorCode: errorCode || newState.errorCode,
				selectedAccount,
				selectedProperty,
				selectedProfile,
				properties: [ chooseAccount ],
				profiles: [ chooseAccount ],
				existingTag: existingTagData ? existingTagData.propertyID : false,
				useSnippet,
			};

			if ( selectedAccount && '0' !== selectedAccount ) {
				newState = Object.assign( newState, {
					properties: responseData.properties,
					profiles: responseData.profiles,
					selectedinternalWebProperty: ( responseData.properties[ 0 ] ) ? responseData.properties[ 0 ].internalWebPropertyID : 0,
				} );
			}
		} catch ( err ) {
			newState = {
				isLoading: false,
				errorCode: err.code,
				errorMsg: err.message,
				errorReason: err.data && err.data.reason ? err.data.reason : false,
			};
		}

		return new Promise( ( resolve ) => {
			if ( this._isMounted ) {
				this.setState( newState, resolve );
			} else {
				resolve();
			}
		} );
	}

	async processAccountChange( selectValue ) {
		try {
			const queryArgs = {
				accountID: selectValue,
			};

			const responseData = await data.get( TYPE_MODULES, 'analytics', 'properties-profiles', queryArgs );

			const chooseProperty = {
				id: 0,
				name: __( 'Setup a New Property', 'google-site-kit' ),
			};
			responseData.properties.push( chooseProperty );
			const chooseProfile = {
				id: 0,
				name: __( 'Setup a New Profile', 'google-site-kit' ),
			};
			responseData.profiles.push( chooseProfile );

			this.setState( {
				propertiesLoading: false,
				profilesLoading: false,
				properties: responseData.properties,
				profiles: responseData.profiles,
				selectedAccount: selectValue,
				selectedProperty: responseData.properties[ 0 ].id,
				selectedinternalWebProperty: responseData.properties[ 0 ].internalWebPropertyID,
				selectedProfile: responseData.profiles[ 0 ].id,
				errorCode: false,
			} );
		} catch ( err ) {
			this.setState( {
				errorCode: err.code,
				errorMsg: err.message,
			} );
		}
	}

	async processPropertyChange( selectValue ) {
		const { selectedAccount } = this.state;

		try {
			const queryArgs = {
				accountID: selectedAccount,
				propertyID: selectValue,
			};

			const responseData = await data.get( TYPE_MODULES, 'analytics', 'profiles', queryArgs );

			this.setState( {
				profilesLoading: false,
				profiles: responseData,
				selectedProperty: selectValue,
				selectedinternalWebProperty: responseData[ 0 ].internalWebPropertyID,
				selectedProfile: responseData[ 0 ].id,
				errorCode: false,
			} );
		} catch ( err ) {
			this.setState( {
				errorCode: err.code,
				errorMsg: err.message,
			} );
		}
	}

	async handleSubmit( e ) {
		if ( e ) {
			e.preventDefault();
		}

		if ( ! this.state.selectedAccount || '-1' === this.state.selectedAccount ) {
			return;
		}

		const {
			anonymizeIP,
			selectedAccount,
			selectedProperty,
			selectedProfile,
			useSnippet,
			selectedinternalWebProperty,
			accounts,
			properties,
			profiles,
			ampClientIDOptIn,
			trackingDisabled,
		} = this.state;

		this.setState( {
			isSaving: true,
		} );

		const {
			finishSetup,
		} = this.props;

		// Ensure that values of `0` are not treated as false-y, causing an error to
		// appear.
		// See: https://github.com/google/site-kit-wp/issues/398#issuecomment-540024321
		const profileID = selectedProfile || ( profiles[ 0 ].id || profiles[ 0 ].id === 0 ? profiles[ 0 ].id.toString() : null );
		const propertyID = selectedProperty || ( properties[ 0 ].id || properties[ 0 ].id === 0 ? properties[ 0 ].id.toString() : null );
		let internalWebPropertyID;
		if ( propertyID === '0' ) {
			internalWebPropertyID = '0';
		} else {
			// Capitalization rule exception: `internalWebPropertyId` is a property of an API returned value.
			internalWebPropertyID = selectedinternalWebProperty || ( properties[ 0 ].internalWebPropertyId || properties[ 0 ].internalWebPropertyId === 0 ? properties[ 0 ].internalWebPropertyId.toString() : null );
		}

		const analyticAccount = {
			anonymizeIP,
			accountID: selectedAccount || accounts[ 0 ].id || null,
			profileID,
			propertyID,
			internalWebPropertyID,
			useSnippet: useSnippet || false,
			ampClientIDOptIn: ampClientIDOptIn || false,
			trackingDisabled,
		};

		try {
			const savedSettings = await data.set( TYPE_MODULES, 'analytics', 'settings', analyticAccount );

			data.invalidateCacheGroup( TYPE_MODULES, 'analytics', 'accounts-properties-profiles' );
			await this.getAccounts();

			global.googlesitekit.modules.analytics.settings = savedSettings;

			trackEvent( 'analytics_setup', 'analytics_configured' );

			if ( finishSetup ) {
				finishSetup();
			}

			if ( this._isMounted ) {
				this.setState( {
					isSaving: false,
					selectedAccount: savedSettings.accountID,
					selectedProfile: savedSettings.profileID,
					selectedProperty: savedSettings.propertyID,
					selectedinternalWebProperty: savedSettings.internalWebPropertyID,
				} );
			}
		} catch ( err ) {
			this.setState( {
				isSaving: false,
				errorCode: err.code,
				errorMsg: err.message,
			} );
		}
	}

	static createNewAccount( e ) {
		e.preventDefault();
		trackEvent( 'analytics_setup', 'new_analytics_account' );

		global.open( 'https://analytics.google.com/analytics/web/?#/provision/SignUp', '_blank' );
	}

	handleRadioClick( e ) {
		const value = e.target.value;
		const useSnippet = ( '1' === value );
		this.setState( {
			useSnippet,
		} );

		trackEvent( 'analytics_setup', useSnippet ? 'analytics_tag_enabled' : 'analytics_tag_disabled' );
	}

	switchStatus( stateVariable ) {
		return () => {
			this.setState( {
				[ stateVariable ]: ! this.state[ stateVariable ],
			} );
		};
	}

	handleRefetchAccount() {
		this.setState(
			{
				isLoading: true,
				errorCode: false,
				errorMsg: '',
				selectedAccount: '0',
				selectedProperty: '-1',
				selectedProfile: '-1',
				propertiesLoading: false,
				profilesLoading: false,
			},
			this.getAccounts
		);
	}

	handleExclusionsChange( e ) {
		const { trackingDisabled } = this.state;
		const { id: exclusion, checked } = e.target;

		// Rebuild the exclusions list.
		const exclusionMap = Object.assign(
			{},
			// Convert [ key1, key2, .. ] to { key1: true, key2: true, ..}
			...trackingDisabled.map( ( exclusionKey ) => ( { [ exclusionKey ]: true } ) ),
			// Add in the current change
			{ [ exclusion ]: checked },
		);

		// Re-set the state as a list of enabled exclusions.
		this.setState( {
			trackingDisabled: Object.keys( exclusionMap ).filter( ( key ) => exclusionMap[ key ] ),
		} );
	}

	renderAutoInsertSnippetForm() {
		const {
			anonymizeIP,
			useSnippet,
			isSaving,
			ampClientIDOptIn,
			existingTag,
		} = this.state;

		const {
			isEditing,
			onSettingsPage,
		} = this.props;
		const disabled = ! isEditing;
		const { ampEnabled, ampMode } = global.googlesitekit.admin;
		const useSnippetSettings = global.googlesitekit.modules.analytics.settings.useSnippet;

		return (
			<div className="googlesitekit-setup-module__inputs googlesitekit-setup-module__inputs--multiline">
				{
					( isEditing || isSaving ) &&
						<Fragment>
							{ onSettingsPage &&
								<Fragment>
									{ ! useSnippetSettings && ! existingTag &&
										<Fragment>
											<p className="googlesitekit-setup-module__text--no-margin">{ __( 'Currently there is no Analytics snippet placed on your site, so no stats are being gathered. Would you like Site Kit to insert the Analytics snippet? You can change this setting later.', 'google-site-kit' ) }</p>
										</Fragment>
									}
									{ useSnippetSettings &&
										<p className="googlesitekit-setup-module__text--no-margin">{ __( 'Do you want to remove the Analytics snippet inserted by Site Kit?', 'google-site-kit' ) }</p>
									}
								</Fragment>
							}
							{ onSettingsPage && ! existingTag && ! useSnippet && useSnippetSettings &&
								<p>{ __( 'If the code snippet is removed, you will no longer be able to gather Analytics insights about your site.', 'google-site-kit' ) }</p>
							}
						</Fragment>
				}
				{ onSettingsPage &&
					<Fragment>
						{ existingTag &&
							<p>{ __( 'Placing two tags at the same time is not recommended.', 'google-site-kit' ) }</p>
						}
						<Radio
							onClick={ this.handleRadioClick }
							id="useSnippetTrue"
							name="useSnippet"
							value="1"
							checked={ useSnippet }
							disabled={ disabled }
						>
							{ ! useSnippetSettings ? __( 'Insert snippet', 'google-site-kit' ) : __( 'Not at this time', 'google-site-kit' ) }
						</Radio>
						<Radio
							onClick={ this.handleRadioClick }
							id="useSnippetFalse"
							name="useSnippet"
							value="0"
							checked={ ! useSnippet }
							disabled={ disabled }
						>
							{ useSnippetSettings ? __( 'Remove snippet', 'google-site-kit' ) : __( 'Not at this time', 'google-site-kit' ) }
						</Radio>
					</Fragment>
				}
				{ useSnippet && ampEnabled &&
					<div className="googlesitekit-setup-module__input">
						<Switch
							id="ampClientIDOptIn"
							label={ __( 'Opt in AMP Client ID', 'google-site-kit' ) }
							onClick={ this.switchStatus( 'ampClientIDOptIn' ) }
							checked={ ampClientIDOptIn }
							hideLabel={ false }
						/>
						<p>
							{ ampClientIDOptIn ?
								__( 'Sessions will be combined across AMP/non-AMP pages.', 'google-site-kit' ) + ' ' :
								__( 'Sessions will be tracked separately between AMP/non-AMP pages.', 'google-site-kit' ) + ' '
							}
							<Link href="https://support.google.com/analytics/answer/7486764" external inherit>{ __( 'Learn more', 'google-site-kit' ) }</Link>
						</p>
					</div>
				}
				{ onSettingsPage && useSnippet && ampMode !== 'primary' && (
					<div className="googlesitekit-setup-module__input">
						<Switch
							id="anonymizeIP"
							label={ __( 'Anonymize IP addresses', 'google-site-kit' ) }
							onClick={ this.switchStatus( 'anonymizeIP' ) }
							checked={ anonymizeIP }
							hideLabel={ false }
						/>
						<p>
							{ anonymizeIP ?
								__( 'IP addresses will be anonymized.', 'google-site-kit' ) :
								__( 'IP addresses will not be anonymized.', 'google-site-kit' )
							}
							{ ' ' }
							<Link
								href="https://support.google.com/analytics/answer/2763052"
								external
								inherit
								dangerouslySetInnerHTML={
									{
										__html: __( 'Learn more<span class="screen-reader-text"> about IP anonymization.</span>', 'google-site-kit' ),
									}
								} />
						</p>
					</div>
				) }
			</div>
		);
	}

	accountsDropdown() {
		const {
			accounts,
			selectedAccount,
			existingTag,
		} = this.state;

		const {
			isEditing,
		} = this.props;

		let disabled = ! isEditing;
		if ( existingTag && selectedAccount ) {
			disabled = true;
		}

		return (
			<Select
				className="googlesitekit-analytics__select-account"
				enhanced
				name="accounts"
				value={ selectedAccount || '0' }
				onEnhancedChange={ this.handleAccountChange }
				label={ __( 'Account', 'google-site-kit' ) }
				disabled={ disabled }
				outlined
			>
				{ accounts
					.concat( ! existingTag ? [ { id: '-1', name: __( 'Set up a new account', 'google-site-kit' ) } ] : [] )
					.map( ( account, id ) =>
						<Option
							key={ id }
							value={ account.id }
						>
							{ account.name }
						</Option>
					) }
			</Select>
		);
	}

	renderForm() {
		const {
			anonymizeIP,
			isLoading,
			propertiesLoading,
			profilesLoading,
			accounts,
			properties,
			profiles,
			selectedAccount,
			selectedProperty,
			selectedProfile,
			useSnippet,
			existingTag,
			errorCode,
			trackingDisabled,
		} = this.state;

		const {
			onSettingsPage,
			isEditing,
		} = this.props;
		// The account number will be an integer if valid, otherwise zero.
		const accountNumber = parseInt( selectedAccount ) || 0;
		// -1 is used for "create an account", so ensure accountNumber is a positive integer.
		const enablePropertySelect = ! existingTag && accountNumber > 0;
		// Profiles may still be selected even in the case of an existing tag.
		const enableProfileSelect = !! /^UA-/.test( selectedProperty.toString() );

		const { ampMode } = global.googlesitekit.admin;
		const { setupComplete } = global.googlesitekit.modules.analytics;

		if ( isLoading ) {
			return <ProgressBar />;
		}

		if ( 'google_analytics_existing_tag_permission' === errorCode ) {
			return null;
		}

		if ( ! accounts.length || '-1' === selectedAccount ) {
			if ( ! isEditing ) {
				return __( 'No account found.', 'google-site-kit' );
			}
			if ( ! setupComplete || isEditing ) {
				return (
					<Fragment>
						{ '-1' === selectedAccount &&
							<Fragment>
								<p>{ __( 'To create a new account, click the button below which will open the Google Analytics account creation screen in a new window.', 'google-site-kit' ) }</p>
								<p>{ __( 'Once completed, click the link below to re-fetch your accounts to continue.', 'google-site-kit' ) }</p>
							</Fragment>
						}
						<div className="googlesitekit-setup-module__action">
							<Button onClick={ AnalyticsSetup.createNewAccount }>{ __( 'Create an account', 'google-site-kit' ) }</Button>

							<div className="googlesitekit-setup-module__sub-action">
								<Link onClick={ this.handleRefetchAccount }>{ __( 'Re-fetch My Account', 'google-site-kit' ) }</Link>
							</div>
						</div>
					</Fragment>
				);
			}
		}

		if ( ! isEditing ) {
			let tagStateMessage = useSnippet ? __( 'Snippet is inserted', 'google-site-kit' ) : __( 'Snippet is not inserted', 'google-site-kit' );
			if ( existingTag ) {
				tagStateMessage = __( 'Inserted by another plugin or theme', 'google-site-kit' );
			}

			return (
				<Fragment>
					<div className="googlesitekit-settings-module__meta-items">
						<div className="googlesitekit-settings-module__meta-item">
							<p className="googlesitekit-settings-module__meta-item-type">
								{ __( 'Account', 'google-site-kit' ) }
							</p>
							<h5 className="googlesitekit-settings-module__meta-item-data">
								{ selectedAccount || accounts[ 0 ].name || false }
							</h5>
						</div>
						<div className="googlesitekit-settings-module__meta-item">
							<p className="googlesitekit-settings-module__meta-item-type">
								{ __( 'Property', 'google-site-kit' ) }
							</p>
							<h5 className="googlesitekit-settings-module__meta-item-data">
								{ selectedProperty || properties[ 0 ].name || false }
							</h5>
						</div>
						<div className="googlesitekit-settings-module__meta-item">
							<p className="googlesitekit-settings-module__meta-item-type">
								{ __( 'View', 'google-site-kit' ) }
							</p>
							<h5 className="googlesitekit-settings-module__meta-item-data">
								{ selectedProfile || profiles[ 0 ].name || false }
							</h5>
						</div>
					</div>
					<div className="googlesitekit-settings-module__meta-items">
						<div className="
							googlesitekit-settings-module__meta-item
						">
							<p className="googlesitekit-settings-module__meta-item-type">
								{ __( 'Analytics Code Snippet', 'google-site-kit' ) }
							</p>
							<h5 className="googlesitekit-settings-module__meta-item-data">
								{ tagStateMessage }
							</h5>
						</div>
					</div>
					{ onSettingsPage && useSnippet && ampMode !== 'primary' && (
						<div className="googlesitekit-settings-module__meta-items">
							<div className="
								googlesitekit-settings-module__meta-item
							">
								<p className="googlesitekit-settings-module__meta-item-type">
									{ __( 'IP Address Anonymization', 'google-site-kit' ) }
								</p>
								<h5 className="googlesitekit-settings-module__meta-item-data">
									{ anonymizeIP &&
										__( 'IP addresses are being anonymized.', 'google-site-kit' )
									}
									{ ! anonymizeIP &&
										__( 'IP addresses are not being anonymized.', 'google-site-kit' )
									}
								</h5>
							</div>
						</div>
					) }
					<div className="googlesitekit-settings-module__meta-items">
						<div className="
							googlesitekit-settings-module__meta-item
						">
							<p className="googlesitekit-settings-module__meta-item-type">
								{ __( 'Excluded from Analytics', 'google-site-kit' ) }
							</p>
							<h5 className="googlesitekit-settings-module__meta-item-data">
								{ !! trackingDisabled.length &&
										trackingDisabled
											.map( ( exclusion ) => trackingExclusionLabels[ exclusion ] )
											.join( _x( ', ', 'list separator', 'google-site-kit' ) )
								}
								{ ! trackingDisabled.length &&
									__( 'Analytics is currently enabled for all visitors.', 'google-site-kit' )
								}
							</h5>
						</div>
					</div>
				</Fragment>
			);
		}

		return (
			<Fragment>
				{ ! onSettingsPage && 0 < accounts.length && ! existingTag &&
					<p>{ __( 'Please select the account information below. You can change this view later in your settings.', 'google-site-kit' ) }</p>
				}
				<div className="googlesitekit-setup-module__inputs">
					{ this.accountsDropdown() }
					{ propertiesLoading ? ( <ProgressBar small /> ) : (
						<Select
							className="googlesitekit-analytics__select-property"
							enhanced
							name="properties"
							value={ selectedProperty || selectedProperty === 0 ? selectedProperty.toString() : '-1' }
							onEnhancedChange={ this.handlePropertyChange }
							label={ __( 'Property', 'google-site-kit' ) }
							disabled={ ! enablePropertySelect }
							outlined
						>
							{ properties.map( ( property, id ) =>
								<Option
									key={ id }
									value={ property.id }>
									{ property.name }
								</Option> ) }

						</Select>
					) }
					{ profilesLoading ? ( <ProgressBar small /> ) : (
						<Select
							className="googlesitekit-analytics__select-profile"
							enhanced
							name="profiles"
							value={ selectedProfile || selectedProfile === 0 ? selectedProfile.toString() : '-1' }
							onEnhancedChange={ this.handleProfileChange }
							label={ __( 'View', 'google-site-kit' ) }
							disabled={ ! enableProfileSelect }
							outlined
						>
							{ profiles.map( ( profile, id ) =>
								<Option
									key={ id }
									value={ profile.id }>
									{ profile.name }
								</Option> ) }

						</Select>
					) }
				</div>

				{ /*Render the auto snippet toggle form.*/ }
				{ this.renderAutoInsertSnippetForm() }

				{ onSettingsPage && this.renderExclusionsForm() }

				{ /*Render the continue and skip button.*/ }
				{
					! onSettingsPage &&
					<div className="googlesitekit-setup-module__action">
						<Button
							disabled={ ! this.state.selectedAccount }
							onClick={ this.handleSubmit }>{ __( 'Configure Analytics', 'google-site-kit' ) }</Button>
					</div>
				}
			</Fragment>
		);
	}

	renderExclusionsForm() {
		const { trackingDisabled } = this.state;

		return (
			<div>
				<p className="googlesitekit-setup-module__text">
					{ __( 'Exclude from Analytics', 'google-site-kit' ) }
				</p>

				<div className="mdc-form-field">
					<Switch
						id={ TRACKING_LOGGED_IN_USERS }
						label={ trackingExclusionLabels[ TRACKING_LOGGED_IN_USERS ] }
						onClick={ this.handleExclusionsChange }
						checked={ trackingDisabled.includes( TRACKING_LOGGED_IN_USERS ) }
						hideLabel={ false }
					/>
				</div>

				<p>
					{ trackingDisabled.includes( TRACKING_LOGGED_IN_USERS ) ?
						__( 'Logged-in users will be excluded from Analytics tracking.', 'google-site-kit' ) :
						__( 'Logged-in users will be included in Analytics tracking.', 'google-site-kit' )
					}
				</p>
			</div>
		);
	}

	renderErrorOrNotice() {
		const {
			errorCode,
			errorMsg,
			errorReason,
			accounts,
		} = this.state;

		const {
			onSettingsPage,
		} = this.props;

		if ( ! errorCode ) {
			return null;
		}

		let showErrorFormat = true; // default error message.
		let message = errorMsg;

		switch ( true ) {
			case 'google_analytics_existing_tag_permission' === errorCode:
				showErrorFormat = true;
				break;
			case onSettingsPage && errorCode && 'insufficientPermissions' === errorReason:
				showErrorFormat = false;
				message = __( 'You currently don\'t have access to this Google Analytics account. You can either request access from your team, or remove this Google Analytics snippet and connect to a different account.', 'google-site-kit' );
				break;
			case ! onSettingsPage && 0 === accounts.length:
				showErrorFormat = false;
				message = __( 'Looks like you don\'t have an Analytics account yet. Once you create it, click on "Re-fetch my account" and Site Kit will locate it.', 'google-site-kit' );
				break;
		}

		if ( ! message || 0 === message.length ) {
			return null;
		}

		return (
			<div className={ classnames( { 'googlesitekit-error-text': showErrorFormat } ) }>
				<p>{
					showErrorFormat ?

						/* translators: %s: Error message */
						sprintf( __( 'Error: %s', 'google-site-kit' ), message ) :
						message
				}</p>
			</div>
		);
	}

	render() {
		// The description section is hidden when displaying on the settings page.
		const { onSettingsPage } = this.props;
		const {
			existingTag,
		} = this.state;

		if ( ! onSettingsPage ) {
			trackEvent( 'analytics_setup', 'configure_analytics_screen' );
		}

		return (
			<div className="googlesitekit-setup-module googlesitekit-setup-module--analytics">
				{
					! onSettingsPage &&
						<Fragment>
							<div className="googlesitekit-setup-module__logo">
								<SvgIcon id="analytics" width="33" height="33" />
							</div>
							<h2 className="
								googlesitekit-heading-3
								googlesitekit-setup-module__title
							">
								{ _x( 'Analytics', 'Service name', 'google-site-kit' ) }
							</h2>
						</Fragment>
				}

				{ !! existingTag &&
					<p>{ sprintf( __( 'An existing analytics tag was found on your site with the id %s. If later on you decide to replace this tag, Site Kit can place the new tag for you. Make sure you remove the old tag first.', 'google-site-kit' ), existingTag ) }</p>
				}

				{ this.renderErrorOrNotice() }

				{ this.renderForm() }
			</div>
		);
	}
}

AnalyticsSetup.propTypes = {
	onSettingsPage: PropTypes.bool,
	finishSetup: PropTypes.func,
	isEditing: PropTypes.bool,
};

AnalyticsSetup.defaultProps = {
	onSettingsPage: true,
	isEditing: false,
};

export default AnalyticsSetup;
