window.onload = function(){
    //Menu - Click
    let menuShown = false;
    let menu = document.getElementsByClassName("menu")[0];

    menu.onclick = function(){
        let doubleL = document.querySelector(".doubleLine .line:nth-child(1)");
        doubleL.style.width = "0";
        setTimeout(function(){
            doubleL.style.width = "30px";

        },500);
        let doubleL2 = document.querySelector(".doubleLine .line:nth-child(2)");
        doubleL2.style.width = "0";
        setTimeout(function(){
            doubleL2.style.width = "40px";

        },500);
        
        if(!menuShown){
            let tab = document.getElementsByClassName("menuTab")[0];
            tab.style.height = "320%";
            menuShown = true;
        }
        else{
            let tab = document.getElementsByClassName("menuTab")[0];
            tab.style.height = "0";
            menuShown = false;
        }
      

    }

    //Line hover

    let line = document.querySelector(".who .leftLine");
    if(line != null){
        line.onmouseover = function(){
            line.style.height = "0px";
            setTimeout(function(){
                line.style.height = "inherit";
    
            },500);
        }
        
    }


}


function openCredits(){
    if(window.location.pathname !== '/credits.html')
    window.location = "credits.html";
    
  }