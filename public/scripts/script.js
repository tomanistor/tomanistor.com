$(document).ready(function() {

    $(window).scroll(function() {
        if( $(this).scrollTop() > 450 ) {
            $(".nav").addClass("nav-scrolled");
        } else {
            $(".nav").removeClass("nav-scrolled");
        }
    });

});
