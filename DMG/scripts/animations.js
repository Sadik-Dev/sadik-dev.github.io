let visiblePropIndex = 1
let childs;

function imageGliderMouseIn(){
    let image1 =  $('.fadingImageContainer img:nth-child(1)');
    let image2 =  $('.fadingImageContainer img:nth-child(2)');
    
    image1.css('opacity',"1");
    image2.css('opacity',"0.1");
    image1.css('z-index',"3");
    image2.css('z-index',"-1");



}

function imageGliderMouseOut(){
    let image1 =  $('.fadingImageContainer img:nth-child(1)');
    let image2 =  $('.fadingImageContainer img:nth-child(2)');

    image1.css('opacity',"0.1");
    image2.css('opacity',"1");
    image1.css('z-index',"2");
    image2.css('z-index',"3");

}

function initAutoSlider(){
    let slider = $("#autoSlider")[0];
    slider.onwheel = function(){ 
        window.scroll();
     }

    let childs = slider.children;
    let childcount = slider.children.length - 1;
    let nextIndex = 1;

    initShortcuts();
    slideAutoSlider(nextIndex, childs, childcount);

    let timer = setInterval(function(){
        slideAutoSlider(nextIndex, childs, childcount);
    },2000);

    function initShortcuts(){
        let amount = childcount - 1;

        for(let i = 0; i < amount; i++){
            let divsc = document.createElement("div");
            divsc.className = "shortcut";
            divsc.setAttribute("index",i+1);
            divsc.onclick = function(){
                let index = divsc.getAttribute('index') == 1 ? 0 : divsc.getAttribute('index'); 
                childs[index ].scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'nearest'
                });

                $('.shortcut').css('background', '#d6d6d6ab');
                divsc.style.background = "#E79D6C";
                clearInterval(timer);

            }
            $('.propertiesSC').append(divsc);

        }
    }
    function slideAutoSlider(nIndex, childs, childcount){
        nextIndex = nIndex + 1;
        nextIndex = checkNextIndex(nextIndex);
        let nextEl = childs[nextIndex];
    
        scrollToElement(nextEl);
        $('.shortcut').css('background', '#d6d6d6ab');
        $('.shortcut')[nextIndex - 1].style.background = "#E79D6C";
    }

    function scrollToElement(el) {
        const elLeft = el.offsetLeft + el.offsetWidth;
        const elParentLeft = el.parentNode.offsetLeft + el.parentNode.offsetWidth / 2;
      
        // check if element not in view
        if (elLeft >= elParentLeft + el.parentNode.scrollLeft) {
          el.parentNode.scrollLeft = elLeft - (elParentLeft);
        } else if (elLeft <= el.parentNode.offsetLeft + el.parentNode.scrollLeft) {
          el.parentNode.scrollLeft = (el.offsetLeft / 2) - el.parentNode.offsetLeft;
        }
    }
    function checkNextIndex(i){
        result = i % childcount;

        if(result == 0){
            return 1;
        }
        else{
            return result;
        }
    }


}



