function initFilters(){
    let filterDoms = document.getElementsByClassName("filter");
    for(let i = 1; i < filterDoms.length; i++){
     let count =  projects.map( p =>  p.type == i ? 1 : 0).reduce( (a,b) => a+b,0);
     filterDoms[i].children[1].innerText = count;
    }

    filterDoms[0].children[1].innerText = projects.length;
}

function filter(type){

            let filterDoms = document.getElementsByClassName("filter");
            for(let i = 0; i < filterDoms.length; i++){
                filterDoms[i].style.color = "#6e6d7a";
            }
            filterDoms[type].style.color = "black";
            
            let cards = document.getElementsByClassName("promo")[0];

            cards.innerHTML = '';

            projects.forEach(p => {
                if(p.type == type || type == 0){

                    let card = document.createElement("div");
                    card.className = "cardP";
                    card.style.background = p.color;
                    let img = document.createElement("img");
                    img.src = p.image;

                    if(type == 2){
                        img.classList.add("app");
                    }
                    

                    card.append(img);

                    let col = document.createElement("div");
                    col.className = "col";

                    let h3 = document.createElement("h3");
                    h3.innerText = p.title;

                    col.append(h3);

                    let ul = document.createElement("ul");
                    p.specs.forEach(s => {
                        let li = document.createElement("li");
                        li.innerText = s;

                        ul.append(li);
                    });

                    col.append(ul);

                    let button = document.createElement("a");
                    button.href = p.url;
                    button.target = "_blank";
                    button.innerText = "Discover";

                    if( p.shade.length >1){
                        h3.style.color = p.shade;
                        ul.style.color = p.shade;
                        button.style.color = p.shade;
                        button.style.border = "2px solid " + p.shade; 
                    }
                    card.append(col);
                    card.append(button);

                    cards.append(card);

                }
            });

            
            if(cards.children.length == 0){
                let card = document.createElement("div");
                card.className = "noprojects cardP";
                
                let img = document.createElement("img");
                img.src = "images/Empty-rafiki.png";

                card.append(img);

                let col = document.createElement("div");
                col.className = "col";

                let h3 = document.createElement("h2");
                h3.innerText = "No projects to show :(";
                col.append(h3);

                let h2 = document.createElement("h3");
                h2.innerText = "Check back soon !";
                col.append(h2);

             
              
                card.append(col);
                cards.append(card);
            }

}


let projects = [
   /* {
        image: "images/assister.png ",
        title: "App: Assister",
        type: 2,
        specs: [
            "Streaming website",
            "Asp.Net MVC"
        ],
        url: "https://orientalia-show.com",
        color: "#ffbb98",
        shade: "white"

        },*/
    {
        image: "images/ors.png ",
        title: "Web App: Orientalia Show",
        type: 1,
        specs: [
            "Streaming website",
            "Asp.Net MVC"
        ],
        url: "https://orientalia-show.com",
        color: "#bf0a30",
        shade: "white"

        }
        ,
    {
        image: "images/hmt1.png ",
        title: "Website: HM Technics",
        type: 1,
        specs: [
            "Construction company",
            "Asp.Net MVC",
            "Lazy_Gallery.js"
        ],
        url: "http://hmtechnics.be",
        color: "white",
        shade: "black"

        }
,
    {
        image: "images/fm.png ",
        title: "Website: FM Concept",
        type: 1,
        specs: [
            "Construction company",
            "HTML, CSS and JS",
            "Lazy_Gallery.js"
        ],
        url: "http://f-mconcept.be",
        color: "#0C0B07",
        shade: "white"

    },
    {
        image: "images/lazy_gallery.jpg",
        url: "https://github.com/Sadik-Dev/Lazy_Gallery.js",
        type: 3,
        color: "#2E425A",
        title: "Framework: Lazy_Gallery.js",
        specs: [
            "Lazy Gallery is a small js framework designed to quickly create one or more lazy loading slideshows",
            ".Net Support to fetch automatically all images from specific folders"
        ],
        shade: "white"
    }
,
    {        title: "Website: Lock-smith",
        image: "images/locksmith.png",
        url: "https://lock-smith.be",
        type: 1,
        color: "#f4f4f4",
        specs: [
            "HTML, CSS and JS"
        ],
        shade: "black"
    }

]
    
    
