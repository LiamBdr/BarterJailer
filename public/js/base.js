$( document ).ready(function() {


    setTimeout(function() {
        $('.flash-message').fadeOut( 200 );
    }, 4000);

    $( ".flash-message" ).on( "click", function() {
        $(this).fadeOut(200);
    });

});