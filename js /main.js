    function fazer_login(){
        const form = document.querySelector("form");

        form.addEventListener("submit", (e) => {
            e.preventDefault();

            const usuario =   document.getElementById('user').value.trim();
            const senha = document.getElementById('pass').value.trim();
            if (usuario != "" && senha != ""){
               window.location.href = "../html/home.html"; 

            }else{
                alert("Usuário ou Senha inválidos")
            }

        });
    }

function mostrar_senha() {
    let password_id = document.getElementById('pass');
    let mostre_senha = document.getElementById('showpass');

    if (password_id.type === 'password') {
        password_id.type = "text";
        mostre_senha.textContent = "🙈";
        mostre_senha.setAttribute("aria-label", "Ocultar Senha");
    } else {
        password_id.type = "password";
        mostre_senha.textContent = "🙉";
        mostre_senha.setAttribute("aria-label", "Mostrar Senha");
    }
}

function cadastrar(){



    const form = document.querySelector("form");
  
    if(form){
        form.addEventListener("submit", (e) => {
        
        const senha = document.querySelector("#pass_cad");
        const confirmacao = document.querySelector("#pass_confir");

        if( senha.value != confirmacao.value){
            alert("As senhas devem ser iguais");
            e.preventDefault();
        }else{
            alert("Cadastro realizado com sucesso! ");
            window.location.href = "../html/login.html"; 
        }
    })
    }
}
