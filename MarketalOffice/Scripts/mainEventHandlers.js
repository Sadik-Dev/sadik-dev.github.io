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
        element.get(0).scrollIntoView();
    });
 
}
});