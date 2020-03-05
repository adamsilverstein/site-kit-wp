<?php
/**
 * AssetsTest
 *
 * @package   Google\Site_Kit\Tests\Core\Assets
 * @copyright 2019 Google LLC
 * @license   https://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://sitekit.withgoogle.com
 */

namespace Google\Site_Kit\Tests\Core\Assets;

use Google\Site_Kit\Context;
use Google\Site_Kit\Core\Assets\Assets;
use Google\Site_Kit\Tests\TestCase;

/**
 * @group Assets
 */
class AssetsTest extends TestCase {

	public function setUp() {
		parent::setUp();

		wp_scripts()->registered = array();
		wp_scripts()->queue      = array();
		wp_styles()->registered  = array();
		wp_styles()->queue       = array();
	}

	public function test_register() {
		$actions_to_test = array(
			'admin_enqueue_scripts',
			'wp_enqueue_scripts',
			'admin_print_scripts',
			'wp_print_scripts',
			'admin_print_styles',
			'wp_print_styles',
		);
		foreach ( $actions_to_test as $hook ) {
			remove_all_actions( $hook );
		}

		$assets = new Assets( new Context( GOOGLESITEKIT_PLUGIN_MAIN_FILE ) );
		$assets->register();

		foreach ( $actions_to_test as $hook ) {
			$this->assertTrue( has_action( $hook ) );
		}
	}

	public function test_enqueue_asset() {
		// Also check registration since that is automatically done in the method if needed.
		$this->assertFalse( wp_script_is( 'googlesitekit-base', 'registered' ) );
		$this->assertFalse( wp_script_is( 'googlesitekit-base', 'enqueued' ) );

		$assets = new Assets( new Context( GOOGLESITEKIT_PLUGIN_MAIN_FILE ) );

		$assets->enqueue_asset( 'googlesitekit-base' );

		$this->assertTrue( wp_script_is( 'googlesitekit-base', 'registered' ) );
		$this->assertTrue( wp_script_is( 'googlesitekit-base', 'enqueued' ) );
	}

	public function test_enqueue_asset_with_unknown() {
		$this->assertFalse( wp_script_is( 'unknown_script', 'enqueued' ) );

		$assets = new Assets( new Context( GOOGLESITEKIT_PLUGIN_MAIN_FILE ) );

		$assets->enqueue_asset( 'unknown_script' );

		$this->assertFalse( wp_script_is( 'unknown_script', 'enqueued' ) );
	}

	public function test_enqueue_fonts() {
		remove_all_actions( 'login_enqueue_scripts' );

		$mock_context = $this->getMockBuilder( 'MockClass' )->setMethods( array( 'is_amp' ) )->getMock();
		$mock_context->expects( $this->once() )
			->method( 'is_amp' )
			->will( $this->returnValue( false ) );

		$assets = new Assets( new Context( GOOGLESITEKIT_PLUGIN_MAIN_FILE ) );
		$this->force_set_property( $assets, 'context', $mock_context );

		add_action( 'login_enqueue_scripts', array( $assets, 'enqueue_fonts' ) );
		do_action( 'login_enqueue_scripts' );

		// Ensure the method does not execute its logic twice (via the above once check).
		do_action( 'login_enqueue_scripts' );

		$this->assertTrue( has_action( 'login_head' ) );
	}

	public function test_run_before_print_callbacks() {
		$assets = new Assets( new Context( GOOGLESITEKIT_PLUGIN_MAIN_FILE ) );

		remove_all_actions( 'wp_print_scripts' );
		$assets->register();

		// Enqueue script that has 'googlesitekit-commons' as dependency.
		$assets->enqueue_asset( 'googlesitekit-dashboard' );

		// Ensure that 'googlesitekit-commons' is enqueued too.
		$this->assertTrue( wp_script_is( 'googlesitekit-dashboard', 'enqueued' ) );
		$this->assertTrue( wp_script_is( 'googlesitekit-commons', 'enqueued' ) );

		do_action( 'wp_print_scripts' );

		// Ensure that before_print callback for 'googlesitekit-commons' was run (its localized script should be there).
		$localized_script = wp_scripts()->get_data( 'googlesitekit-commons', 'data' );
		$this->assertContains( 'var googlesitekit = ', $localized_script );
	}
}
