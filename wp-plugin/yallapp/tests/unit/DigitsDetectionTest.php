<?php
/**
 * Digits and its add-ons are found by their plugin header, whatever their folder.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Detector;

class DigitsDetectionTest extends TestCase {

	private function header( $name, $version, $description = '', $author = '' ) {
		return array(
			'Name'        => $name,
			'Version'     => $version,
			'Description' => $description,
			'Author'      => $author,
		);
	}

	public function test_finds_digits_in_a_renamed_folder_with_its_version() {
		$found = Detector::find_digits(
			array(
				'tutor/tutor.php'               => $this->header( 'Tutor LMS', '3.2.0' ),
				'digits-8332/digit.php'         => $this->header( 'DIGITS: WordPress Mobile Number Signup and Login', '8.3.3.2', '', 'UnitedOver' ),
				'woocommerce/woocommerce.php'   => $this->header( 'WooCommerce', '9.0.0' ),
			)
		);
		$this->assertTrue( $found['active'] );
		$this->assertSame( '8.3.3.2', $found['version'] );
		$this->assertSame( array(), $found['addons'] );
	}

	public function test_lists_the_additional_sms_gateways_add_on() {
		$found = Detector::find_digits(
			array(
				'digits/digit.php'                           => $this->header( 'DIGITS: WordPress Mobile Number Signup and Login', '8.3.3.2' ),
				'digits-addons-gateways/gateways.php'       => $this->header( 'Additional SMS Gateways', '7.1' ),
				'more-gateways/more.php'                     => $this->header( 'More gateways', '1.0', 'Adds SMS gateways to Digits.' ),
				'tutor/tutor.php'                            => $this->header( 'Tutor LMS', '3.2.0' ),
			)
		);
		$this->assertTrue( $found['active'] );
		$this->assertSame(
			array(
				array(
					'name'    => 'Additional SMS Gateways',
					'version' => '7.1',
				),
				array(
					'name'    => 'More gateways',
					'version' => '1.0',
				),
			),
			$found['addons']
		);
	}

	public function test_nothing_found_without_digits() {
		$found = Detector::find_digits( array( 'tutor/tutor.php' => $this->header( 'Tutor LMS', '3.2.0' ) ) );
		$this->assertFalse( $found['active'] );
		$this->assertSame( '', $found['version'] );
	}
}
