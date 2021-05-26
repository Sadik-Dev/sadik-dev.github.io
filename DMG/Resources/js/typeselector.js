"use strict"

document.addEventListener("DOMContentLoaded", init())

function init(){
    ChooseTypeSectionHandler();
    console.log("ik ben klaar");
}

// Puts mouseover and mouseleave event on every card
function ChooseTypeSectionHandler(){
    let cards = document.getElementsByClassName("card");
    for(let i = 0; i < cards.length; i++){
        cards[i].addEventListener("mouseover", function(event) {
            console.log(cards[i])
            handleCardSizesIn(cards[i]);

        });
        
        
    }
   
}

// Handles sizes for when the users mouse moves into a card
function handleCardSizesIn(card){
    let concernedCards = giveMeConcernedElementIds(card);
    changeCssPropertiesMouseIn(card,concernedCards);

        card.addEventListener("mouseleave",function(event){
            handleCardSizesOut(card,concernedCards);

        })
    

}

// Handles sizes for when the users mouse leaves a card
function handleCardSizesOut(card,concernedCards){
    changeCssPropertiesMouseOut(card,concernedCards);
    

}

// changes properties in css
function changeCssPropertiesMouseIn(card, concernedCards){

    document.getElementById(concernedCards[0]).style.flexBasis = "25%"
    document.getElementById(concernedCards[1]).style.flexBasis = "25%"
    card.style.width = "50%"
    card.getElementsByClassName("cardImg")[0].style.width = "100%";
    card.getElementsByClassName("cardImg")[0].style.height = "auto";

}

// changes properties in css
function changeCssPropertiesMouseOut(card, concernedCards){
    card.style.width = "33%";
    document.getElementById(concernedCards[0]).style.flexBasis = "33%";
    document.getElementById(concernedCards[1]).style.flexBasis = "33%";
    card.getElementsByClassName("cardImg")[0].style.width = "auto";
    card.getElementsByClassName("cardImg")[0].style.height = "100%";
}



// based on card, returns the ids of the two other cards in that row.
function giveMeConcernedElementIds(card){
    let res = [];
    let cardIdInt = parseInt(card.id);
    if(cardIdInt == 1 || cardIdInt == 4){
        res.push(cardIdInt+1);
        res.push(cardIdInt+2);
    }else if(cardIdInt == 3 || cardIdInt == 6){
        res.push(cardIdInt - 1);
        res.push(cardIdInt - 2);
    }else{
        res.push(cardIdInt+1);
        res.push(cardIdInt-1);
    }
    
    return res;
}



