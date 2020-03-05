/**
 * Layout component.
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
import PropTypes from 'prop-types';
import LayoutHeader from 'GoogleComponents/layout/layout-header';
import LayoutFooter from 'GoogleComponents/layout/layout-footer';
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { Component } from '@wordpress/element';

class Layout extends Component {
	render() {
		const {
			header,
			footer,
			children,
			title,
			headerCtaLabel,
			headerCtaLink,
			footerCtaLabel,
			footerCtaLink,
			footerContent,
			className,
			fill,
			relative,
		} = this.props;

		return (
			<div className={ classnames(
				'googlesitekit-layout',
				className,
				{
					'googlesitekit-layout--fill': fill,
					'googlesitekit-layout--relative': relative,
				}
			) }>
				{ header &&
					<LayoutHeader
						title={ title }
						ctaLabel={ headerCtaLabel }
						ctaLink={ headerCtaLink }
					/>
				}
				{ children }
				{ footer &&
					<LayoutFooter
						ctaLabel={ footerCtaLabel }
						ctaLink={ footerCtaLink }
						footerContent={ footerContent }
					/>
				}
			</div>
		);
	}
}

Layout.propTypes = {
	header: PropTypes.bool,
	footer: PropTypes.bool,
	children: PropTypes.node.isRequired,
	title: PropTypes.string,
	headerCtaLabel: PropTypes.string,
	headerCtaLink: PropTypes.string,
	footerCtaLabel: PropTypes.string,
	footerCtaLink: PropTypes.string,
	footerContent: PropTypes.node,
	className: PropTypes.string,
	fill: PropTypes.bool,
	relative: PropTypes.bool,
};

Layout.defaultProps = {
	header: false,
	footer: false,
	title: '',
	headerCtaLabel: '',
	headerCtaLink: '',
	footerCtaLabel: '',
	footerCtaLink: '',
	footerContent: null,
	className: '',
	fill: false,
	relative: false,
};

export default Layout;
