function lazyImages(){
    var images = document.querySelectorAll('.lazyImage');

    for(let i = 0; i < images.length; i++){
        var downloadingImage = new Image();
        downloadingImage.onload = function(){
            images[i].src = this.src;   
        };
        var imageSrc  = images[i].getAttribute('data-src');
        if(imageSrc){
            downloadingImage.src = imageSrc;
        }
    
    }

 
}