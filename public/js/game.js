//VARIABLES POUR API
let gameId = document.querySelector('.gameId').value,
    userId = parseInt(document.querySelector('.userId').value),
    getUrl = window.location,
    //baseUrl = getUrl.protocol + "//" + getUrl.host + "/jeu/",
    baseUrl = getUrl.protocol + "//" + getUrl.host + "/",
    apiGetUrl = baseUrl + "api/games/" + gameId,
    game = [];

//VARIABLES POUR JEU
let singleCardContent,
    singleCardParent,
    selectedCards = {},
    selectedSellCards = {},
    currentRound = 0;


//ÉLÉMENTS HTML
let player1Cards = document.querySelector('.player1-cards'),
    player1Enclos = document.querySelector('.player1-enclos'),
    player1BonusTokens = document.querySelector('.player1-bonus-tokens'),
    player1Tokens = document.querySelector('.player1-tokens'),
    player2Cards = document.querySelector('.player2-cards'),
    player2Enclos = document.querySelector('.player2-enclos'),
    player2Tokens = document.querySelector('.player2-tokens'),
    player2BonusTokens = document.querySelector('.player2-bonus-tokens'),
    market = document.querySelector('.market'),
    pioche = document.querySelector('.pioche'),
    defausse = document.querySelector('.defausse'),
    tokensPioche = document.querySelector('.pioche-tokens'),
    bonusTokensPioche = document.querySelector('.pioche-bonus-tokens'),
    gameRound = document.querySelector('.game-round')


//BOUTONS HTML

let validTurnBtn =  document.querySelector('#validTurn');



window.onload = function() {
    getAllData();

    //échange les cartes sélectionnées au préalable
    validTurnBtn.addEventListener('click', validTurn)
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
    displayTokens(game.stockTokens, tokensPioche, 'token')
    displayTokens(game.player1Tokens, player1Tokens, 'token')
    displayTokens(game.player2Tokens, player2Tokens, 'token')
    //affiche chaque conteneur avec des jetons bonus
    displayTokens(game.stockBonusTokens, bonusTokensPioche, 'bonusToken')
    displayTokens(game.player1BonusTokens, player1BonusTokens, 'bonusToken')
    displayTokens(game.player2BonusTokens, player2BonusTokens, 'bonusToken')
    //affichage des autres informations
    gameRound.innerHTML = game.round;

    selectedTakeCards = {};
    selectedSellCards = {};

    if (currentRound === 0) {
        currentRound = game.round;
    } else {
        //CHANGEMENT DE MANCHE
        if (currentRound !== game.round) {
            alert('CHANGEMENT DE MANCHE');
            roundFinish();
        }
    }

    //actualise les données toutes les secondes si ce n'est pas au tour de l'utilisateur
    const waitTurnInterval = setInterval(function (){
        if (parseInt(game.playerTurn) !== userId) { // le joueur attends son tour
            getAllData();
        } else { //c'est au tour du joueur
            clearInterval(waitTurnInterval);
        }
    }, 1000);

    // affichage des boutons de jeu en fonction du tour
    if (parseInt(game.playerTurn) !== userId) { // le joueur attends son tour

        validTurnBtn.classList.add('block');
        validTurnBtn.innerHTML = 'C\'est à votre adversaire de jouer !';

    }
    else { //c'est au tour du joueur

        validTurnBtn.classList.add('block');
        validTurnBtn.innerHTML = 'A votre tour !';
        detectClick(); //ajoute le click listener sur les cartes
        // validTurnBtn.style.display = "fixed";
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
function displayTokens(array, dom, type) {
    let div;
    dom.innerHTML = '';

    Object.entries(array).forEach(([key, token]) => {
        div = document.createElement("div", );
        div.className = 'token '+type+' '+token.type;
        div.setAttribute("id", type+key);
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
    let parents = [game.player1Cards, game.player1Enclos, game.player2Cards, game.player2Enclos, game.stockCards, game.market, game.defausse];

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

//ÉCOUTE ET DÉFINIS L'ACTION A RÉALISER LORS DU CLICK
function detectClick() {
    //récupère toutes les éléments html cartes
    let allCardsDom = document.querySelectorAll(".card");

    // click listener sur toutes les cartes
    for (let i = 0; i < allCardsDom.length; i++) {
        allCardsDom[i].addEventListener('click', function() {

            //récupère le contenu de la carte
            getSingleCard(this.id)

            //le joueur click sur ses cartes (main + enclos)
            if ( ( (singleCardParent === game.player1Cards || singleCardParent === game.player1Enclos) && parseInt(game.player1.id) === userId) || ( (singleCardParent === game.player2Cards || singleCardParent === game.player2Enclos) && parseInt(game.player2.id) === userId)) {
                selectCards(selectedSellCards);
            }

            //le joueur click sur le marché
            if (singleCardParent === game.market) {

                if (singleCardContent.type === 'chameau') {
                    //SÉLECTIONNE TOUS LES CHAMEAUX DU MARCHÉ
                    Object.entries(game.market).forEach(([key, card]) => {
                        if (card['type'] === 'chameau') {
                            singleCardContent = card;
                            selectCards(selectedTakeCards);
                        }
                    });
                } else {
                    selectCards(selectedTakeCards);
                }
            }


            //DÉTECTION DE L'ACTION DU JOUEUR
            validTurnBtn.classList.remove("block");

            let sellCardsArray = Object.keys(selectedSellCards),
                takeCardsArray = Object.keys(selectedTakeCards);


            // il y a des cartes de sélectionnées
            if (sellCardsArray.length > 0 || takeCardsArray.length > 0) {

                //le joueur a sélectionnée des cartes à vendre
                if (sellCardsArray.length > 0) {

                    /******* ÉCHANGE DE CARTES *******/
                    //le joueur a sélectionné des cartes à échanger
                    if (takeCardsArray.length > 0) {

                        let error = false;

                        //vérifie qu'il y ai le même nombre de cartes à échanger et qu'il y ai au moins 2 cartes à échanger
                        if ((takeCardsArray.length !== sellCardsArray.length) ||  sellCardsArray.length < 2 || takeCardsArray.length < 2) {
                            error = true;
                        }

                        //vérifie qu'il n'y ai pas de chameaux dans les cartes à prendre
                        Object.values(selectedTakeCards).forEach(function (card) {
                            if (card['type'] === 'chameau') {
                                error = true;
                            }
                        });

                        //vérifie que le joueur ne dépasse pas 7 cartes
                        let sellCount = 0,
                            playerCardsCount;

                        if (parseInt(game.player1.id) === userId) {
                            playerCardsCount = Object.keys(game.player1Cards).length;
                        }
                        else {
                            playerCardsCount = Object.keys(game.player2Cards).length;
                        }

                        //compter le nombre de carte à vendre chameau
                        Object.values(selectedSellCards).forEach(function (card) {
                            if (card['type'] === 'chameau') {
                                sellCount++;
                            }
                        })
                        //erreur si le joueur aura plus de 7 cartes
                        if ((playerCardsCount+sellCount) > 7) {
                            error = true;
                        }

                        let testArray = Object.values(selectedTakeCards);
                        //vérifie que le joueur ne troc pas le même type de carte
                        for (let i = 0; i < testArray.length; i++) {
                            Object.values(selectedSellCards).forEach(function (card) {
                                if (card['type'] === testArray[i]['type']) {
                                    error = true;
                                }
                            })
                        }



                        if (error === false) {
                            validTurnBtn.innerHTML = 'Échanger les marchandises';
                        } else {
                            validTurnBtn.innerHTML = 'A votre tour !';
                            validTurnBtn.classList.add("block");
                        }

                    }
                    /******* VENTE DE CARTES *******/
                    //le joueur n'a pas sélectionné de carte à échanger
                    else  {

                        let error = false,
                            rareTest = 0,
                            typeTestArray = Object.values(selectedSellCards);

                        //test la présence de marchandises rares
                        Object.values(selectedSellCards).forEach(function (card) {
                            if (card['type'] === 'diamant' || card['type'] === 'or' || card['type'] === 'argent') {
                                rareTest++;
                            }
                        })

                        if (rareTest > 0 && rareTest < 2) {
                            error = true;
                        }

                        //test pour que les marchandises soient du même type et pas un chameau
                        for (let i = 0; i < typeTestArray.length; i++) {
                            typeTestArray.forEach(function (card) {
                                if (typeTestArray[i]['type'] !== card['type']) {
                                    error = true;
                                }

                                if (card['type'] === 'chameau') {
                                    error = true;
                                }
                            })
                        }

                        //les marchandises ne sont pas du même type ou il y a un chameau
                        if (error === true) {
                            validTurnBtn.innerHTML = 'A votre tour !';
                            validTurnBtn.classList.add("block");
                        } else {
                            if (sellCardsArray.length === 1) {
                                validTurnBtn.innerHTML = 'Vendre cette marchandise';
                            } else {
                                validTurnBtn.innerHTML = 'Vendre ces marchandises';
                            }
                        }

                    }

                }
                else { // le joueur n'a pas sélectionné de cartes à vendre ou échanger

                    /******* PRENDRE UNE SEULE MARCHANDISE *******/
                    //si le joueur a sélectionné une seule carte
                    if (takeCardsArray.length === 1) {

                        //vérifie que le joueur ne dépasse pas 7 cartes
                        let error = false,
                            playerCardsCount;

                        if (parseInt(game.player1.id) === userId) {
                            playerCardsCount = Object.keys(game.player1Cards).length;
                        }
                        else {
                            playerCardsCount = Object.keys(game.player2Cards).length;
                        }

                        if ((playerCardsCount + 1) > 7) {
                            error = true;
                        }

                        if (error === true) {
                            validTurnBtn.innerHTML = 'A votre tour !';
                            validTurnBtn.classList.add("block");
                        } else {
                            validTurnBtn.innerHTML = 'Prendre la marchandise';
                        }

                    }
                    /******* PRENDRE TOUS LES CHAMEAUX *******/
                    else { //le joueur a plusieurs cartes à prendre

                        let error = false;
                        Object.entries(selectedTakeCards).forEach(([key, card]) => {
                            if (card['type'] !== 'chameau') {
                                error = true;
                            }
                        });

                        //si l'ensemble des cartes sont des chameaux
                        if (error === false) {
                            validTurnBtn.innerHTML = 'Prendre tous les chameaux';
                        } else {
                            validTurnBtn.innerHTML = 'A votre tour !';
                            validTurnBtn.classList.add("block");
                        }

                    }


                }

            }
            // aucune carte n'est sélectionnée
            else {
                validTurnBtn.innerHTML = 'A votre tour !';
                validTurnBtn.classList.add("block");
            }

        });
    }
}

/************************
 ************************
 FONCTIONS ACTIONS DU JEU
 ************************
 ************************/

//SÉLECTIONNE PLUSIEURS CARTES POUR L'ÉCHANGE
function selectCards(selectedCards) {

    let selected = ifCardSelected(selectedCards),
        domSelectedCard = document.getElementById(singleCardContent['id']),
        className;

    if (selectedCards === selectedTakeCards) {
        className = "selectTake";
    } else {
        className = "selectSell";
    }

    //la carte est sélectionnée
    if (selected === true) {

        removeSelectedCard(selectedCards, domSelectedCard, className)

    } else {// la carte n'est pas sélectionnée

        if (selectedCards === selectedTakeCards) { //TAKE CARDS

            addSelectedCard(selectedTakeCards, domSelectedCard, className)

        } else { //SELL CARDS

            addSelectedCard(selectedSellCards, domSelectedCard, className)

        }

    }

}

/************************
 ************************
 FONCTIONS POUR SÉLECTIONS DES CARTES
 ************************
 ************************/

//TEST SI LA CARTE N'EST PAS DÉJÀ SÉLECTIONNÉE
function ifCardSelected(selectedCards) {
    let selected = false;

    Object.entries(selectedCards).forEach(([key, card]) => {
        if (card === singleCardContent) {
            selected = true;
        }
    });

    return selected;
}

//AJOUTE CARTE DANS LA SÉLECTION
function addSelectedCard(selectedCards, domSelectedCard, className) {
    domSelectedCard.classList.add(className);
    //ajoute la carte au tableau des cartes sélectionnées
    selectedCards[singleCardContent['id']] = singleCardContent;
}

//SUPPRIME CARTE DE LA SÉLECTION
function removeSelectedCard(selectedCards, domSelectedCard, className) {
    domSelectedCard.classList.remove(className);
    delete selectedCards[singleCardContent['id']];
}

/************************
 ************************
 FONCTIONS FETCH POUR API CUSTOM
 ************************
 ************************/

//ÉCHANGE LES CARTES ENTRE CELLES DU JOUEUR ET CELLES DU MARCHÉ
function validTurn() {
    let sendData = {};
    sendData["selectedTakeCards"] = selectedTakeCards;
    sendData["selectedSellCards"] = selectedSellCards;


    if (Object.keys(sendData["selectedTakeCards"]).length > 0 || Object.keys(sendData["selectedSellCards"]).length > 0) {
        sendRequest('validTurn', gameId, sendData);
    }
}

/************************
 ************************
 FONCTIONS FETCH POUR API REST
 ************************
 ************************/

function sendRequest(apiMethod, gameId, gameData) {
    fetch(baseUrl+'game/api/'+apiMethod+'/'+gameId,{
        method:'POST',
        headers:{
            'Content-Type':'application/merge-patch+json'
        },
        body:JSON.stringify(gameData)
    }).then(response=>{
        return response.json()
    }).then(function (data) {
        if (typeof data === 'string' ) {
            console.error(data)
        } else {
            console.warn(data);
            getAllData();
        }
    });
}

function getAllData() {
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
            if (JSON.stringify(data) !== JSON.stringify(game)) {
                game = data;
                console.log(game);
                gameDisplay(); //affiche le jeu
            }
        })
        .catch(function(error) {
            console.error('DATA API ERROR : '+ error );
        });
}

/************************
 ************************
  ANIMATIONS FONCTIONS
 ************************
 ************************/

function roundFinish() {

    let gamePop = document.querySelector('#game-pop');
    let gamePopContainer = document.querySelector('#game-pop .pop--container');

    gamePopContainer.innerHTML = '';

    let tokenPointsPlayer1 = 0;
    Object.entries(game.player1Tokens).forEach(function (token) {
        tokenPointsPlayer1 += parseInt(token['val']);
    })

    let bonusTokenPointsPlayer1 = 0;
    Object.entries(game.player1BonusTokens).forEach(function (token) {
        bonusTokenPointsPlayer1 += parseInt(token['val']);
    })

    let tokenPointsPlayer2 = 0;
    Object.entries(game.player2Tokens).forEach(function (token) {
        tokenPointsPlayer2 += parseInt(token['val']);
    })

    let bonusTokenPointsPlayer2 = 0;
    Object.entries(game.player2BonusTokens).forEach(function (token) {
        bonusTokenPointsPlayer2 += parseInt(token['val']);
    })

    //vérifie qui a le plus de chameaux
    let moreBonusPlayer1 = 0,
        moreBonusPlayer2 = 0;
    if (Object.keys(game.player1Enclos).length > Object.keys(game.player2Enclos).length ) {
        moreBonusPlayer1 = 5;
    }
    else if (Object.keys(game.player2Enclos).length > Object.keys(game.player1Enclos).length ) {
        moreBonusPlayer2 = 5;
    }

    let resultatPlayer1 = 'Perdant',
        resultatPlayer2 = 'Perdant';

    if ((tokenPointsPlayer1 + bonusTokenPointsPlayer1 + moreBonusPlayer1) > (tokenPointsPlayer2 + bonusTokenPointsPlayer2 + moreBonusPlayer2)) {
        resultatPlayer1 = 'Vainqueur';
    }
    else if ((tokenPointsPlayer1 + bonusTokenPointsPlayer1 + moreBonusPlayer1) < (tokenPointsPlayer2 + bonusTokenPointsPlayer2 + moreBonusPlayer2)) {
        resultatPlayer2 = 'Vainqueur';
    }
    else {

        //égalité -> vérifie le nombre de token bonus
        if (Object.keys(game.player1BonusTokens).length > Object.keys(game.player2BonusTokens).length ) {
            resultatPlayer1 = 'Vainqueur';
        } else if (Object.keys(game.player2BonusTokens).length > Object.keys(game.player1BonusTokens).length ) {
            resultatPlayer2 = 'Vainqueur';
        } else {

            //égalité -> vérifie le nombre de token
            if (Object.keys(game.player1Tokens).length > Object.keys(game.player2Tokens).length ) {
                resultatPlayer1 = 'Vainqueur';
            } else {
                resultatPlayer2 = 'Vainqueur';
            }
        }
    }

    let div = document.createElement("div");
    div.innerHTML =
        `<strong>`+resultatPlayer1+`</strong>
        <p>`+game.player1.username+`</p>
        <img class="avatar" src="`+baseUrl+'avatars/'+game.player1.avatar+`.png" alt="Avatar de `+game.player1.username+`">
        <ul>
            <li>Jetons : `+tokenPointsPlayer1+` dollars</li>
            <li>Jetons bonus : `+bonusTokenPointsPlayer1+` dollars</li>
            <li>Jeton chameau : `+moreBonusPlayer1+` dollars</li>
            <li><b>Total : `+(tokenPointsPlayer1 + bonusTokenPointsPlayer1 + moreBonusPlayer1)+` Points</b></li>
         </ul>`;

    gamePopContainer.append(div);

    let div2 = document.createElement("div");
    div2.innerHTML =
        `<strong>`+resultatPlayer2+`</strong>
        <p>`+game.player2.username+`</p>
        <img class="avatar" src="`+baseUrl+'avatars/'+game.player2.avatar+`.png" alt="Avatar de `+game.player2.username+`">
        <ul>
            <li>Jetons : `+tokenPointsPlayer2+` dollars</li>
            <li>Jetons bonus : `+bonusTokenPointsPlayer2+` dollars</li>
            <li>Jeton chameau : `+moreBonusPlayer2+` dollars</li>
            <li><b>Total : `+(tokenPointsPlayer2 + bonusTokenPointsPlayer2 + moreBonusPlayer2)+` Points</b></li>
         </ul>`;

    gamePopContainer.append(div2);

    gamePop.classList.add('show');

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
        totalTokens = parseInt(Object.keys(game.player1Tokens).length) + parseInt(Object.keys(game.player2Tokens).length) + parseInt(Object.keys(game.stockTokens).length),
        totalCards = parseInt(p1Total) + parseInt(p2Total) + parseInt(marketTotal) + parseInt(piocheTotal) + parseInt(defausseTotal) + parseInt(p1Enclos) + parseInt(p2Enclos);

    document.querySelector('#p1Total').innerHTML = p1Total;
    document.querySelector('#p1Points').innerHTML = game.player1Points;
    document.querySelector('#p2Total').innerHTML = p2Total;
    document.querySelector('#p2Points').innerHTML = game.player2Points;
    document.querySelector('#marketTotal').innerHTML = marketTotal;
    document.querySelector('#piocheTotal').innerHTML = piocheTotal;
    document.querySelector('#fausseTotal').innerHTML = defausseTotal;
    document.querySelector('#totalCards').innerHTML = totalCards;
    document.querySelector('#totalTotal').innerHTML = totalTokens;
    document.querySelector('.playerTurn').innerHTML = game.playerTurn; //affiche le tour de l'utilisateur
}