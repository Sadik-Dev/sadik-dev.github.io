function sendMail(){

    let form = document.getElementById("contact-form");
    let name = form.children[1].value;
    let email = form.children[2].value;
    let number = form.children[3].value;
    let message = form.children[4].value;

    if(name && email && number && message){

        Email.send({
            SecureToken : "bb775618-2466-4e4a-9893-094f813f5c52",
            To : 'oussama-sadik@outlook.com',
            From : "oussama-sadik@outlook.com",
            Subject : "Mail from " + name ,
            Body : "<h3>Mail from</h3>: " + email + "<br><br>" + message 
        }).then(
          message => alert(message)
        );
    
    }
    else{
        alert("Please fill all the fields")
    }
    

  
}