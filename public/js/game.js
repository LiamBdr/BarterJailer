//variables pour API
let gameId = document.querySelector('.gameId').value,
    userId = parseInt(document.querySelector('.userId').value),
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
    validTurnBtn =  document.querySelector('.valid-btn'),
    tokensPioche = document.querySelector('.pioche-tokens');


window.onload = function() {
    getData();

    //DETECTION DU CLICK POUR FINIR LE TOUR
    validTurnBtn.addEventListener('click', finishTurn);
};

function gameDisplay()
{
    //AFFICHAGE DES CARTES
    displayCards(game.player1Cards, player1Cards);
    displayCards(game.player2Cards, player2Cards);
    displayCards(game.market, market);
    displayCards(game.stockCards, pioche);
    displayCards(game.defausse, defausse);
    displayTokens(game.stockTokens, tokensPioche)

    // ACTUALISE LES DONNÉES TOUTES LES 1.5s
    const waitTurnInterval = setInterval(function (){
        if (parseInt(game.playerTurn) !== userId) { // JOUEUR ATTEND SON TOUR
            getData();
        } else { //C'EST AU TOUR DE L'UTILISATEUR
            clearInterval(waitTurnInterval);
        }
    }, 700);

    if (parseInt(game.playerTurn) !== userId) { // JOUEUR ATTEND SON TOUR
        validTurnBtn.style.display = "none";
    } else { //C'EST AU TOUR DE L'UTILISATEUR
        //AJOUT CLICK LISTENER ON CARDS
        detectClick();
        validTurnBtn.style.display = "inline-block";
    }

    debugCardsNumber();
}

//AFFICHAGE DES CARTES
function displayCards(array, dom) {
    let div;
    dom.innerHTML = '';

    Object.entries(array).forEach(([key, card]) => {
        div = document.createElement("div", );
        div.className = "card " +card.type;
        div.setAttribute("id", key);

        div.innerHTML = card.type + '('+card.id+')';
        dom.appendChild(div);
    });
}

//AFFICHAGE DES CARTES
function displayTokens(array, dom) {
    let div;
    dom.innerHTML = '';

    Object.entries(array).forEach(([key, token]) => {
        div = document.createElement("div", );
        div.className = "token " +token.type;
        div.setAttribute("id", key);
        div.innerHTML = token.val;
        dom.appendChild(div);
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
    if (parseInt(game.playerTurn) === userId) {

        if (userId === parseInt(game.player1.id)) { // le joueur est le player1
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


function detectClick() {
    let allCardsDom = document.querySelectorAll(".card");

    // BOUCLE CLICK LISTENER ON ALL CARDS
    for (let i = 0; i < allCardsDom.length; i++) {
        allCardsDom[i].addEventListener('click', function() {
            //FONCTION LORS DU CLICK

            getSingleCard(this.id)

            //LE JOUEUR CLICK SUR SES CARTES
            if ( (singleCardParent === game.player1Cards && parseInt(game.player1.id) === userId) || (singleCardParent === game.player2Cards && parseInt(game.player2.id) === userId)) {
                defausseCard();
            }

            if (singleCardParent === game.market) {
                takeOneCard();
            }
        });
    }
}

/************************
 ************************
 ACTION DE JEU FUNCTIONS
 ************************
 ************************/

//ENVOIE CARTE DANS LA FAUSSE
function defausseCard() {
    if (game.defausse.length === 0) { //initialise le tableau json si tableau vide
        game.defausse = {};
    }

    game.defausse[singleCardContent['id']] = singleCardContent; //ajoute la carte dans la fausse
    delete singleCardParent[singleCardContent['id']]; //supprime la carte de son container initial
    gameDisplay(); //reload les cards
    console.log(game);
}

//ENVOIE CARTE DANS LA FAUSSE
function takeOneCard() {

    //JOUEUR 1
    if (parseInt(game.player1.id) === userId) {

        if (Object.keys(game.player1Cards).length < 5) {
            game.player1Cards[singleCardContent['id']] = singleCardContent; //ajoute la carte dans les cartes du joueur
            delete singleCardParent[singleCardContent['id']]; //supprime la carte de son container initial

        } else {
            alert('Vous ne pouvez pas avoir plus de 5 cartes');
        }



    }


    gameDisplay(); //reload les cards
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