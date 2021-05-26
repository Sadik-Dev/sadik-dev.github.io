
$(document).ready(function(){

    //Check if we are going to hide load screen
    if(sessionStorage.getItem('loadingDone') !== null){
        $('body').css('overflow','visible');
        document.body.removeChild($('.loadingScreen')[0]);
    }
    else{
        setTimeout(() => {
            document.body.removeChild($('.loadingScreen')[0]);
            sessionStorage.setItem('loadingDone',true);
            $('body').css('overflow','visible');
        }, 3000);
    }
    //Init AOS Library
    AOS.init();

    //Init auto sliders
    if($('#autoSlider')){
        initAutoSlider();
    }

    //ImageGlider
    if($('.fadingImageContainer')){
        $('.fadingImageContainer').hover(imageGliderMouseIn,imageGliderMouseOut);
    }
    

  

});

