//variables pour API
let gameId = document.querySelector('.gameId').value,
    userId = document.querySelector('.userId').value,
    getUrl = window.location,
    apiGetUrl = getUrl.protocol + "//" + getUrl.host + "/" + "api/games/" + gameId,
    game = [];

//variables pour cartes
let singleCardContent,
    singleCardParent;

//éléments HTML
let player1Cards = document.querySelector('.player1-cards'),
    player2Cards = document.querySelector('.player2-cards'),
    market = document.querySelector('.market'),
    pioche = document.querySelector('.pioche'),
    defausse = document.querySelector('.defausse'),
    validTurnBtn =  document.querySelector('.valid-btn');


window.onload = function() {
    getData();

    //DETECTION DU CLICK POUR FINIR LE TOUR
    validTurnBtn.addEventListener('click', finishTurn);
};

function gameDisplay() {
    //AFFICHAGE DES CARTES
    displayCards(game.player1Cards, player1Cards);
    displayCards(game.player2Cards, player2Cards);
    displayCards(game.market, market);
    displayCards(game.stockCards, pioche);
    displayCards(game.defausse, defausse);

    // ACTUALISE LES DONNÉES TOUTES LES 1.5s
    const waitTurnInterval = setInterval(function (){
        if (parseInt(game.playerTurn) !== parseInt(userId)) { // JOUEUR ATTEND SON TOUR
            getData();
            validTurnBtn.style.display = "none";
        } else { //C'EST AU TOUR DE L'UTILISATEUR
            clearInterval(waitTurnInterval);
            validTurnBtn.style.display = "inline-block";
        }
    }, 1500);


    debugCardsNumber();

    //AJOUT CLICK LISTENER ON CARDS
    detectClick();
}

function detectClick() {
    let allCardsDom = document.querySelectorAll(".card");

    // BOUCLE CLICK LISTENER ON ALL CARDS
    for (let i = 0; i < allCardsDom.length; i++) {
        allCardsDom[i].addEventListener('click', function() {

            //FONCTION LORS DU CLICK
            getSingleCard(this.id) //récupère les data de la carte (SingleCardContent + SingleCardParent)
            defausseCard(); //envoie carte vers la fausse

            // if (!confirm("Jeter cette carte ? " + this.id)) {
            //     event.preventDefault();
            // };

        });
    }
}

//ENVOIE CARTE DANS LA FAUSSE
function defausseCard() {
    if (game.defausse.length === 0) { //initialise le tableau json si tableau vide
        game.defausse = {};
    }

    game.defausse[singleCardContent['id']] = singleCardContent //ajoute la carte dans la fausse
    delete singleCardParent[singleCardContent['id']]; //supprime la carte de son container initial
    gameDisplay(game); //reload les cards
}

//AFFICHAGE DES CARTES
function displayCards(array, dom) {
    let li;
    dom.innerHTML = '';

    Object.entries(array).forEach(([key, card]) => {
        li = document.createElement("div", );
        li.className = "card " +card.type;
        li.setAttribute("id", key);

        li.innerHTML = card.type + '('+card.id+')';
        dom.appendChild(li);
    });
}

//RÉCUPÉRATION DES DONNÉES D'UNE CARTE
function getSingleCard(id) {

    // liste de tous les container avec des cards
    let parents = [game.player1Cards, game.player2Cards, game.stockCards, game.market, game.defausse];

    parents.forEach((parent) => {  //boucle dans chaque container contenant des cartes
        if (Object.keys(parent).length > 0) { //si container a au moins une carte
            Object.keys(parent).forEach((key) => {
                if (key === id) {
                    singleCardParent = parent;
                    singleCardContent = parent[id];
                }
            });

        }
    })

}

function finishTurn() {
    if (parseInt(game.playerTurn) === parseInt(userId)) {

        if (parseInt(userId) === parseInt(game.player1.id)) { // le joueur est le player1
            game.playerTurn = game.player2.id;
        } else { // le joueur est le player2
            game.playerTurn = game.player1.id;
        }

        //récupère les datas susceptible d'avoir changées
        let gameData = {};
        gameData['player1Cards'] = game.player1Cards;
        gameData['player2Cards'] = game.player2Cards;
        gameData['stockCards'] = game.stockCards;
        gameData['market'] = game.market;
        gameData['defausse'] = game.defausse;
        gameData['playerTurn'] = game.playerTurn;

        //mets à jour les données de la partie via l'api
        sendData(gameData);
        //remets les infos du jeu à jour
        gameDisplay();
    }
}

/************************
 ************************
 FETCH FUNCTIONS
 ************************
 ************************/

function sendData(gameData) {
    fetch(apiGetUrl,{
        method:'PATCH',
        headers:{
            'Content-Type':'application/merge-patch+json'
        },
        body:JSON.stringify(gameData)
    }).then(response=>{
        return response.json()
    }).then(function (data) {
        console.log( 'POST DATA SUCCESS' );
        console.log(data)
    });
}

function getData() {
    fetch(apiGetUrl,{
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            console.log( 'GET DATA SUCCESS' );
            if (JSON.stringify(data) !== JSON.stringify(game)) {
                game = data;
                console.log(game);
                gameDisplay(); //affiche le jeu
            }
        })
        .catch(function(error) {
            console.log('DATA API ERROR : '+ error );
        });
}

/************************
 ************************
    DEBUG FUNCTIONS
 ************************
 ************************/

function debugCardsNumber() {
    let p1Total = Object.keys(game.player1Cards).length,
        p2Total = Object.keys(game.player2Cards).length,
        marketTotal = Object.keys(game.market).length,
        piocheTotal = Object.keys(game.stockCards).length,
        defausseTotal = Object.keys(game.defausse).length,
        totalTotal = parseInt(p1Total) + parseInt(p2Total) + parseInt(marketTotal) + parseInt(piocheTotal) + parseInt(defausseTotal);


    document.querySelector('#p1Total').innerHTML = p1Total;
    document.querySelector('#p2Total').innerHTML = p2Total;
    document.querySelector('#marketTotal').innerHTML = marketTotal;
    document.querySelector('#piocheTotal').innerHTML = piocheTotal;
    document.querySelector('#fausseTotal').innerHTML = defausseTotal;
    document.querySelector('#totalTotal').innerHTML = totalTotal;
    document.querySelector('.playerTurn').innerHTML = game.playerTurn; //affiche le tour de l'utilisateur


}