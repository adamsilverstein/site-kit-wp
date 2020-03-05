/* eslint-disable no-restricted-globals */
/* global __STORYBOOK_CLIENT_API__ */
/**
 * External dependencies
 */
import React from 'react';
import { addDecorator, configure } from '@storybook/react';

/**
 * WordPress dependencies
 */
import { createHigherOrderComponent } from '@wordpress/compose';
import {
	Component,
	createRef,
	Fragment,
	createElement,
	createPortal,
} from '@wordpress/element';
import { __, sprintf, setLocaleData } from '@wordpress/i18n';
import {
	getQueryString,
	addQueryArgs,
} from '@wordpress/url';
import lodash from 'lodash';
import {
	addFilter,
	removeFilter,
	addAction,
	doAction,
	applyFilters,
	removeAction,
	removeAllFilters,
} from '@wordpress/hooks';
/**
 * Internal dependencies
 */
import '../assets/sass/wpdashboard.scss';
import '../assets/sass/adminbar.scss';
import '../assets/sass/admin.scss';
import '../vendor/johnpbloch/wordpress-core/wp-admin/css/common.css';
import '../vendor/johnpbloch/wordpress-core/wp-admin/css/dashboard.css';
import '../vendor/johnpbloch/wordpress-core/wp-admin/css/edit.css';
import '../vendor/johnpbloch/wordpress-core/wp-admin/css/forms.css';
import { googlesitekit as dashboardData } from '../.storybook/data/wp-admin-admin.php-page=googlesitekit-dashboard-googlesitekit';

// Default Data.
const googlesitekit = dashboardData;

// Setup.
const wp = {};
wp.element = wp.element || {};
wp.i18n = wp.i18n || {};
wp.hooks = wp.hooks || {};
wp.url = {
	getQueryString,
	addQueryArgs,
};
wp.compose = {};
wp.compose.createHigherOrderComponent = createHigherOrderComponent;
wp.hooks.addFilter = addFilter;
wp.hooks.removeFilter = removeFilter;
wp.hooks.addAction = addAction;
wp.hooks.doAction = doAction;
wp.hooks.applyFilters = applyFilters;
wp.hooks.removeAction = removeAction;
wp.hooks.removeAllFilters = removeAllFilters;
wp.element.Component = Component;
wp.element.createRef = createRef;
wp.element.Fragment = Fragment;
wp.element.createElement = createElement;
wp.element.createPortal = createPortal;
wp.i18n.__ = __ || {};
wp.i18n.setLocaleData = setLocaleData || {};
wp.i18n.sprintf = sprintf || {};
global.wp = global.wp || wp;
global.React = React;
global.lodash = lodash;
global.googlesitekit = global.googlesitekit || googlesitekit;
global.googlesitekit.setup = global.googlesitekit.setup || googlesitekit.setup;
global.googlesitekit.admin = global.googlesitekit.admin || googlesitekit.admin;
global.googlesitekit.modules = global.googlesitekit.modules || googlesitekit.modules;
global.googlesitekit.admin.assetsRoot = '/assets/';
global.googlesitekit.isStorybook = true;
global._googlesitekitBaseData = {
	basePrefix: 'wp_',
	splashURL: 'http://localhost/wp-admin/admin.php?page=googlesitekit-splash',
};

// Global Decorator.
addDecorator( ( story ) => <div className="googlesitekit-plugin-preview">
	<div className="googlesitekit-plugin">{ story() }</div>
</div> );

const req = require.context( '../stories', true, /\.stories\.js$/ );

function loadStories() {
	req.keys().forEach( ( filename ) => req( filename ) );
}

configure( loadStories, module );

// TODO Would be nice if this wrote to a file. This logs our Storybook data to the browser console. Currently it gets put in .storybook/storybook-data and used in tests/backstop/scenarios.js.
// eslint-disable-next-line no-console
console.log( '__STORYBOOK_CLIENT_API__.raw()', __STORYBOOK_CLIENT_API__.raw() );
