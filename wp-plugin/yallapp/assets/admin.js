/* global jQuery, wp, yallappAdmin */
( function ( $ ) {
	'use strict';

	$( function () {
		$( '.yallapp .ya-sortable' ).sortable( { axis: 'y', handle: '.ya-grip, label' } );

		$( '.yallapp [data-ya-image]' ).each( function () {
			var box = $( this );
			var input = box.find( 'input[type=hidden]' );
			var img = box.find( 'img' );
			var clear = box.find( '[data-ya-clear]' );
			var frame;

			box.find( '[data-ya-pick]' ).on( 'click', function () {
				if ( ! frame ) {
					frame = wp.media( {
						title: yallappAdmin.chooseImage,
						button: { text: yallappAdmin.useImage },
						library: { type: 'image' },
						multiple: false
					} );
					frame.on( 'select', function () {
						var image = frame.state().get( 'selection' ).first().toJSON();
						var size = image.sizes && image.sizes.thumbnail ? image.sizes.thumbnail : image;
						input.val( image.id );
						img.attr( 'src', size.url ).prop( 'hidden', false );
						clear.prop( 'hidden', false );
					} );
				}
				frame.open();
			} );

			clear.on( 'click', function () {
				input.val( 0 );
				img.attr( 'src', '' ).prop( 'hidden', true );
				clear.prop( 'hidden', true );
			} );
		} );
	} );
}( jQuery ) );
