$( document ).ready(function() {

    window.scroll(0,0)

    setTimeout(function() {
        $('.flash-message').fadeOut( 200 );
    }, 4000);

    $( ".flash-message" ).on( "click", function() {
        $(this).fadeOut(200);
    });

    $( "#game-pop" ).on( "click", function() {
        $(this).fadeOut(200);
    });


    $("#more-button").on( "click", function(e) {
        e.preventDefault();

        let text = $(".rules-appear");

        if (text.hasClass('show')) {
            text.removeClass('show');
            $("#more-button").removeClass('show');
            $("#more-button span").html("PLUS D’INFORMATIONS");
            setTimeout(function () {
                text.css("display", "none");
            },300)
        } else {
            text.css("display", "block");
            setTimeout(function () {
                text.addClass('show');
                $("#more-button").addClass('show');
                $("#more-button span").html("MOINS D’INFORMATIONS");
            },50)
        }
    });

});