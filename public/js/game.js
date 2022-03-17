//variables pour API
let gameId = document.querySelector('.gameId').value,
    userId = parseInt(document.querySelector('.userId').value),
    getUrl = window.location,
    apiGetUrl = getUrl.protocol + "//" + getUrl.host + "/" + "api/games/" + gameId,
    game = [];

//variables pour cartes
let singleCardContent,
    singleCardParent,
    selectedTakeCards = {},
    selectedSellCards = {};


//éléments HTML
let player1Cards = document.querySelector('.player1-cards'),
    player1Enclos = document.querySelector('.player1-enclos'),
    player1Tokens = document.querySelector('.player1-tokens'),
    player2Cards = document.querySelector('.player2-cards'),
    player2Enclos = document.querySelector('.player2-enclos'),
    player2Tokens = document.querySelector('.player2-tokens'),
    market = document.querySelector('.market'),
    pioche = document.querySelector('.pioche'),
    defausse = document.querySelector('.defausse'),
    validTurnBtn =  document.querySelector('#validTurn'),
    cancelTurnBtn =  document.querySelector('#cancelTurn'),
    exchangeBtn =  document.querySelector('#exchangeCards'),
    tokensPioche = document.querySelector('.pioche-tokens');


window.onload = function() {
    getData();

    //finir le tour et passer au joueur suivant
    validTurnBtn.addEventListener('click', finishTurn);

    //échange les cartes sélectionnées au préalable
    exchangeBtn.addEventListener('click', exchangeCards)

    //annule le tour du joueur et réinitialise le plateau
    cancelTurnBtn.addEventListener('click', getData);
};

/************************
 ************************
 FONCTIONS AFFICHAGE DU JEU
 ************************
 ************************/

//AFFICHE L'ENSEMBLE DU PLATEAU ET GÈRE LE TOUR DU JOUEUR
function gameDisplay() {

    //affiche chaque conteneur avec des cartes
    displayCards(game.player1Cards, player1Cards);
    displayCards(game.player1Enclos, player1Enclos);
    displayCards(game.player2Cards, player2Cards);
    displayCards(game.player2Enclos, player2Enclos);
    displayCards(game.market, market);
    displayCards(game.stockCards, pioche);
    displayCards(game.defausse, defausse);
    //affiche chaque conteneur avec des jetons
    displayTokens(game.stockTokens, tokensPioche)
    displayTokens(game.player1Tokens, player1Tokens)
    displayTokens(game.player2Tokens, player2Tokens)

    //actualise les données toutes les secondes si ce n'est pas au tour de l'utilisateur
    const waitTurnInterval = setInterval(function (){
        if (parseInt(game.playerTurn) !== userId) { // le joueur attends son tour
            getData();
        } else { //c'est au tour du joueur
            clearInterval(waitTurnInterval);
        }
    }, 1000);

    // affichage des boutons de jeu en fonction du tour
    if (parseInt(game.playerTurn) !== userId) { // le joueur attends son tour

        validTurnBtn.style.display = "none";
        cancelTurnBtn.style.display = "none";

    } else { //c'est au tour du joueur

        detectClick(); //ajoute le click listener sur les cartes
        validTurnBtn.style.display = "inline-block";
        cancelTurnBtn.style.display = "inline-block";
    }

    //affiche informations pour debug
    debugCardsNumber();
}

//AFFICHE LES CARTES D'UN TABLEAU DANS UN ELEMENT HTML
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

//AFFICHAGE LES JETONS D'UN TABLEAU DANS UN ELEMENT HTML
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

/************************
 ************************
 FONCTIONS FONCTIONNEMENT DU JEU
 ************************
 ************************/

//RÉCUPÉRATION DES DONNÉES D'UNE CARTE
function getSingleCard(id) {

    //réinitialise la variable
    singleCardParent = null;
    singleCardContent = null;

    // liste de tous les container avec des cards
    let parents = [game.player1Cards, game.player2Cards, game.stockCards, game.market, game.defausse];

    //boucle dans chaque container contenant des cartes
    parents.forEach((parent) => {
        //si le container a au moins une carte
        if (Object.keys(parent).length > 0) {
            //essaye de trouver la carte avec cette id
            Object.keys(parent).forEach((key) => {
                //si carte trouvée sauvegarde dans les variables
                if (key === id) {
                    singleCardParent = parent;
                    singleCardContent = parent[id];
                }
            });

        }
    })

}

//FINI LE TOUR DU JOUEUR EN RENVOYANT LES DONNÉES
function finishTurn() {
    //si c'est bien au tour du joueur
    if (parseInt(game.playerTurn) === userId) {

        //change le tour du joueur
        if (userId === parseInt(game.player1.id)) { // le joueur est le player1
            game.playerTurn = game.player2.id;
        } else { // le joueur est le player2
            game.playerTurn = game.player1.id;
        }

        //récupère les datas susceptible d'avoir changées
        let gameData = {};
        gameData['player1Cards'] = game.player1Cards;
        gameData['player1Tokens'] = game.player1Tokens;
        gameData['player1Enclos'] = game.player1Enclos;
        gameData['player2Cards'] = game.player2Cards;
        gameData['player2Tokens'] = game.player2Tokens;
        gameData['player2Enclos'] = game.player2Enclos;
        gameData['stockCards'] = game.stockCards;
        gameData['stockTokens'] = game.stockTokens;
        gameData['market'] = game.market;
        gameData['defausse'] = game.defausse;
        gameData['playerTurn'] = game.playerTurn;

        //mets à jour les données de la partie via l'api
        sendData(gameData);
        //remets les infos du jeu à jour
        gameDisplay();
    }
}

//ÉCOUTE ET DÉFINIS L'ACTION A RÉALISER LORS DU CLICK
function detectClick() {
    //récupère toutes les éléments html cartes
    let allCardsDom = document.querySelectorAll(".card");

    // click listener sur toutes les cartes
    for (let i = 0; i < allCardsDom.length; i++) {
        allCardsDom[i].addEventListener('click', function() {

            //récupère le contenu de la carte
            getSingleCard(this.id)

            //le joueur click sur ses cartes
            if ( (singleCardParent === game.player1Cards && parseInt(game.player1.id) === userId) || (singleCardParent === game.player2Cards && parseInt(game.player2.id) === userId)) {

                //le joueur a sélectionné des cartes à prendre pour échanger
                if (Object.keys(selectedTakeCards).length > 0) {
                    sellManyCards();
                } else {
                    //la carte n'est pas de type chameau
                    if (singleCardContent.type !== 'chameau') {

                        //vend la carte et récupère un jeton correspondant
                        sellCards();
                        gameDisplay();
                    }
                }
            }

            //le joueur click sur le marché
            if (singleCardParent === game.market) {

                //si la carte est un chameau le joueur récupère tous les chameaux
                if (singleCardContent.type === 'chameau') {
                    takeAllCamels();
                    gameDisplay();
                } else { //si la carte n'est pas un chameau
                    // takeOneCard();
                    takeManyCards();
                }
            }

        });
    }
}

/************************
 ************************
 FONCTIONS ACTIONS DU JEU
 ************************
 ************************/

//VENDRE UNE SEULE CARTE ET RÉCUPÈRE LES JETONS CORRESPONDANT
function sellCards() {
    if (game.defausse.length === 0) { //initialise le tableau json si tableau vide
        game.defausse = {};
    }

    game.defausse[singleCardContent['id']] = singleCardContent; //ajoute la carte dans la fausse
    delete singleCardParent[singleCardContent['id']]; //supprime la carte de son container initial

    let type = singleCardContent['type'],
        tokenTest = null;

    //JOUEUR 1
    if (parseInt(game.player1.id) === userId) {
        if (game.player1Tokens.length === 0) { //initialise le tableau json si tableau vide
            game.player1Tokens = {};
        }

        //rajoute le token dans la main du joueur
        Object.entries(game.stockTokens).forEach(([key, token]) => {
            if (token.type === type && tokenTest === null) {
                tokenTest = token;
                game.player1Tokens[tokenTest.id] = tokenTest;
                delete game.stockTokens[tokenTest.id];
            }
        });
    }

    //JOUEUR 2
    if (parseInt(game.player2.id) === userId) {
        if (game.player2Tokens.length === 0) { //initialise le tableau json si tableau vide
            game.player2Tokens = {};
        }

        //rajoute le token dans la main du joueur
        Object.entries(game.stockTokens).forEach(([key, token]) => {
            if (token.type === type && tokenTest === null) {
                tokenTest = token;
                game.player2Tokens[tokenTest.id] = tokenTest;
                delete game.stockTokens[tokenTest.id];
            }
        });
    }
}

//PRENDRE UNE SEULE CARTE DU MARCHÉ ET LA REMPLACE AVEC LA PIOCHE
function takeOneCard() {

    //JOUEUR 1
    if (parseInt(game.player1.id) === userId) {
       if (Object.keys(game.player1Cards).length < 7) { // SI LE JOUEUR A MOINS DE 7 CARDS
           game.player1Cards[singleCardContent['id']] = singleCardContent; //ajoute la carte dans les cartes du joueur
           delete singleCardParent[singleCardContent['id']]; //supprime la carte de son container initial
           piocheCard();
       } else {
           alert('Vous ne pouvez pas avoir plus de 7 cartes');
       }
    }

    //JOUEUR 2
    if (parseInt(game.player2.id) === userId) {
        if (Object.keys(game.player2Cards).length < 7) { // SI LE JOUEUR A MOINS DE 7 CARDS
            game.player2Cards[singleCardContent['id']] = singleCardContent; //ajoute la carte dans les cartes du joueur
            delete singleCardParent[singleCardContent['id']]; //supprime la carte de son container initial
            piocheCard();
        } else {
            alert('Vous ne pouvez pas avoir plus de 7 cartes');
        }
    }

}

//SÉLECTIONNE PLUSIEURS CARTES À PRENDRE POUR LES ÉCHANGER
function takeManyCards() {

    let selected = false;

    //TEST SI LA CARTE N'EST PAS DÉJÀ SÉLECTIONNÉE
    Object.entries(selectedTakeCards).forEach(([key, card]) => {
        if (card === singleCardContent) {
            selected = true;
        }
    });

    //SI LA CARTE EST SÉLECTIONNÉE
    if (selected === true) {

        let domSelectedCard = document.getElementById(singleCardContent['id']);
        domSelectedCard.classList.remove("selectTake");
        delete selectedTakeCards[singleCardContent['id']];

    } else {

        if (Object.keys(game.player1Cards).length < 7) { // SI LE JOUEUR A MOINS DE 7 CARDS
            //ajoute la classe
            let domSelectedCard = document.getElementById(singleCardContent['id']);
            domSelectedCard.classList.add("selectTake");
            //ajoute la carte au tableau des cartes sélectionnées
            selectedTakeCards[singleCardContent['id']] = singleCardContent;
        } else {
            alert('Vous ne pouvez pas avoir plus de 7 cartes');
        }

    }
}

//SÉLECTIONNE PLUSIEURS CARTES À VENDRE POUR LES ÉCHANGER
function sellManyCards() {

    let selected = false;

    //TEST SI LA CARTE N'EST PAS DÉJÀ SÉLECTIONNÉE
    Object.entries(selectedSellCards).forEach(([key, card]) => {
        if (card === singleCardContent) {
            selected = true;
        }
    });

    //SI LA CARTE EST SÉLECTIONNÉE
    if (selected === true) {

        let domSelectedCard = document.getElementById(singleCardContent['id']);
        domSelectedCard.classList.remove("selectSell");
        delete selectedSellCards[singleCardContent['id']];

    } else { //SI LA CARTE N'EST PAS SÉLECTIONNÉE

        // SI LE NOMBRE DE CARTES VENDUES N'EST PAS SUPÉRIEUR AU CARTES PRISES
        if ((Object.keys(selectedSellCards).length) + 1 <= (Object.keys(selectedTakeCards).length)) {
            //ajoute la classe
            let domSelectedCard = document.getElementById(singleCardContent['id']);
            domSelectedCard.classList.add("selectSell");
            //ajoute la carte au tableau des cartes sélectionnées
            selectedSellCards[singleCardContent['id']] = singleCardContent;
        } else {
            alert('Vous ne pouvez pas vendre plus de cartes que vous prenez');
        }

    }

}

//ÉCHANGE LES CARTES ENTRE CELLES DU JOUEUR ET CELLES DU MARCHÉ
function exchangeCards() {

    //JOUEUR 1
    if (parseInt(game.player1.id) === userId) {

        // VÉRIFIE QU'IL Y A AUTANT DE CARDE A ÉCHANGER
        if (Object.keys(selectedSellCards).length === Object.keys(selectedTakeCards).length) {

            Object.entries(selectedSellCards).forEach(([key, card]) => {
                game.market[card['id']] = card; //ajoute la carte dans le marché
                delete game.player1Cards[card['id']]; //supprime la carte de son container initial
            });

            Object.entries(selectedTakeCards).forEach(([key, card]) => {
                game.player1Cards[card['id']] = card; //ajoute la carte dans le marché
                delete game.market[card['id']]; //supprime la carte de son container initial
            });

            gameDisplay();

        } else {
            alert('Vous devez prendre autant de cartes que vous en échangez');
        }

    }

    //JOUEUR 2
    if (parseInt(game.player2.id) === userId) {

        // VÉRIFIE QU'IL Y A AUTANT DE CARDE A ÉCHANGER
        if (Object.keys(selectedSellCards).length === Object.keys(selectedTakeCards).length) {

            Object.entries(selectedSellCards).forEach(([key, card]) => {
                game.market[card['id']] = card; //ajoute la carte dans le marché
                delete game.player2Cards[card['id']]; //supprime la carte de son container initial
            });

            Object.entries(selectedTakeCards).forEach(([key, card]) => {
                game.player2Cards[card['id']] = card; //ajoute la carte dans le marché
                delete game.market[card['id']]; //supprime la carte de son container initial
            });

            gameDisplay();

        } else {
            alert('Vous devez prendre autant de cartes que vous en échangez');
        }

    }

}

//RÉCUPÈRE TOUS LES CHAMEAUX DE LA PIOCHE ET LES REMPLACES AVEC LA PIOCHE
function takeAllCamels() {

    let nb = 0; //nombre de chameaux récupérés

    if (game.player1Enclos.length === 0) { //initialise le tableau json si tableau vide
        game.player1Enclos = {};
    }

    if (game.player2Enclos.length === 0) { //initialise le tableau json si tableau vide
        game.player2Enclos = {};
    }

    //JOUEUR 1
    if (parseInt(game.player1.id) === userId) {
        //récupère tous les chameaux dans la mains du joueur
        Object.entries(game.market).forEach(([key, card]) => {
            if (card.type === 'chameau') {
                game.player1Enclos[card.id] = card;
                delete game.market[card.id];
                nb++;
            }
        });
    }

    //JOUEUR 2
    if (parseInt(game.player2.id) === userId) {
        //récupère tous les chameaux dans la mains du joueur
        Object.entries(game.market).forEach(([key, card]) => {
            if (card.type === 'chameau') {
                game.player2Enclos[card.id] = card;
                delete game.market[card.id];
                nb++;
            }
        });
    }


    for (let i = 1; i <= nb; i++) { // pioche nb fois
        piocheCard();
    }

}

//PIOCHE UNE CARTE
function piocheCard() {
    // récupère l'ensemble des id de la pioche
    let keys = Object.keys(game.stockCards);
    // récupère l'id max dans la pioche
    let highest = Math.max.apply(null, keys);

    //piocher une carte aléatoire dans la pioche
    let randomKeys = Math.floor(Math.random()*highest);
    let randomCards = game.stockCards[randomKeys];

    // vérifie que la carte existe bien
    if (randomCards) {
        delete game.stockCards[randomCards['id']]; //supprime la carte de la pioche
        game.market[randomCards['id']] = randomCards; //ajoute la carte dans le marché
    } else { // SI CARTE INCORRECT RE-PIOCHER
        piocheCard()
    }
}

/************************
 ************************
 FONCTIONS FETCH POUR API
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
    DEBUG FONCTIONS
 ************************
 ************************/

function debugCardsNumber() {
    let p1Total = Object.keys(game.player1Cards).length,
        p1Enclos = Object.keys(game.player1Enclos).length,
        p2Total = Object.keys(game.player2Cards).length,
        p2Enclos = Object.keys(game.player2Enclos).length,
        marketTotal = Object.keys(game.market).length,
        piocheTotal = Object.keys(game.stockCards).length,
        defausseTotal = Object.keys(game.defausse).length,
        totalCards = parseInt(p1Total) + parseInt(p2Total) + parseInt(marketTotal) + parseInt(piocheTotal) + parseInt(defausseTotal) + parseInt(p1Enclos) + parseInt(p2Enclos);


    document.querySelector('#p1Total').innerHTML = p1Total;
    document.querySelector('#p2Total').innerHTML = p2Total;
    document.querySelector('#marketTotal').innerHTML = marketTotal;
    document.querySelector('#piocheTotal').innerHTML = piocheTotal;
    document.querySelector('#fausseTotal').innerHTML = defausseTotal;
    document.querySelector('#totalCards').innerHTML = totalCards;
    document.querySelector('.playerTurn').innerHTML = game.playerTurn; //affiche le tour de l'utilisateur
}