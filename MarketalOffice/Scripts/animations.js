
function menuMouseIn(){
    $('#menu').css('transform','scale(1.2)');
    $('.iconLine:nth-child(3)').css('width','10px');
    setTimeout(function(){
        $('.iconLine:nth-child(2)').css('width','30px');
        $('.iconLine:nth-child(3)').css('width','30px');

    },500)
}

function menuMouseOut(){
    $('#menu').css('transform','scale(1)');
    $('.iconLine:nth-child(3)').css('width','30px');
    $('.iconLine:nth-child(1)').css('width','10px');
    $('.iconLine:nth-child(2)').css('width','22px')
    setTimeout(function(){
        $('.iconLine:nth-child(1)').css('width','30px');
        $('.iconLine:nth-child(2)').css('width','22px')

    },500)
}

function openMenu(){

    var width = $(document).width() < 800 ? '300px' : '450px';
    $('header').css('display','block');
    $('header').css('background','rgba(0, 0, 0, 0.4)');
    setTimeout(function(){
        $('.headerContainer').css('width', width);
        $('.headerContainer').css('padding','35px');
    },200)
    setTimeout(function(){
        $('.headerTop').css('display','flex');
        $('.headerElement').css('display','flex')
    },300)
}

function closeMenu(){
    $('.headerContainer').css('width','0px');
    $('.headerContainer').css('padding','0');
    setTimeout(function(){
        $('.headerTop').css('display','none');
        $('.headerElement').css('display','none')
    },100)
    setTimeout(function(){
        $('header').css('display','none');
        $('header').css('background','rgba(0, 0, 0, 0)');
    },500)
}