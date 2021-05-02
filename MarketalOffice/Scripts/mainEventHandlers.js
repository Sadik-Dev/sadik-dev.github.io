$(document).ready(function(){

    var pass = prompt('Password:');
    if(pass === 'hmd123'){
        document.getElementsByTagName("html")[0].style.visibility = "visible";
    }
    
    //Menu Hover Effect
    $('#menu').hover(menuMouseIn,menuMouseOut);   
    //Open Menu
    $('#menu').click(openMenu);
    //Close Menu
    $('#closeNav').click(closeMenu);

    //Service cards
    if ( $( ".serviceCard" ).length ) {
 
        $('.serviceCard').click(function(){
            var element = $('#' + $(this).attr('data-scroll'));
          //  element.get(0).scrollIntoView();
          window.scroll(0,findPos(element.get(0)));

        });
    }

    //Scroll Handlers
    if ( $( ".scroll" ).length ) {
 
        $('.scroll').click(function(){
            var element = $('#' + $(this).attr('data-scroll'));
          //  element.get(0).scrollIntoView();
          window.scroll(0,findPos(element.get(0)));

        });
    }

    //Call the lazy_Images.js
    lazyImages();
});

function findPos(obj) {
    var curtop = 0;
    if (obj.offsetParent) {
        do {
            curtop += obj.offsetTop;
        } while (obj = obj.offsetParent);
    return [curtop];
    }
}