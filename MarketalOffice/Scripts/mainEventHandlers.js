$(document).ready(function(){
var pass = prompt('ok');
if(pass === 'hmd123'){
    document.getElementsByTagName("html")[0].style.visibility = "visible";
}
//Menu Hover Effect
$('#menu').hover(menuMouseIn,menuMouseOut);   
//Open Menu
$('#menu').click(openMenu);
//Close Menu
$('#closeNav').click(closeMenu);

});