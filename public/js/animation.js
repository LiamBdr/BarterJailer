window.onload = function() {

    /****** CARTES ADVERSAIRE *******/
    let oppositeCards = [...document.querySelector(".opponent-cards").children],
        rotation = 30,
        rotationChange = (rotation*2) / (oppositeCards.length-1);

    oppositeCards.forEach(function (e) {
        e.style.transform = 'rotate('+rotation+'deg) scaleY(-1) scaleX(-1)' +'translateY('+Math.abs(rotation)*1.5+'px)';
        rotation -= rotationChange;
    })

    /****** TOKENS ADVERSAIRE  *******/
    let opponentTokens = [...document.querySelector(".opponent-tokens").children];
    opponentTokens.forEach(function (e) {
        e.style.transform = 'rotate('+getRandom(-5, 5)+'deg) translateX('+getRandom(-10,10)+'px) translateY('+getRandom(-10,10)+'px)';
    })

    /****** CARTES JOUEUR *******/
    let playerCards = [...document.querySelector(".cards-player").children],
        rotation2 = -15,
        rotationChange2 = (rotation2*2) / (playerCards.length-1);

    playerCards.forEach(function (e) {
        let saveRotate = rotation2;
        e.style.transform = 'rotate('+rotation2+'deg) '+'translateY('+Math.abs(rotation2)*1.8+'px)';
        rotation2 -= rotationChange2;

        //ANIMATIONS DES CARTES
        //hover
        e.addEventListener("mouseover", function() {
            e.style.transform = 'rotate('+saveRotate+'deg) '+'translateY(-30px)';
        });
        //hover-out
        e.addEventListener("mouseout", function() {
            e.style.transform = 'rotate('+saveRotate+'deg) '+'translateY('+Math.abs(saveRotate)*1.8+'px)';
        });
    })

    /****** CHAMEAUX ADVERSAIRES  *******/
    let chameauxPlayer = [...document.querySelector(".opponent-chameaux").children],
        chameauxTranslateY = -30,
        chameauxTranslateYChange = (chameauxTranslateY*2) / (chameauxPlayer.length-1);

   chameauxPlayer.forEach(function (e) {
        e.style.transform = 'translateY('+chameauxTranslateY+'px) '+'rotate('+getRandom(-2,2)+'deg)';
        chameauxTranslateY += chameauxTranslateYChange;
    })

    /****** CARTES PIOCHES  *******/
    let stockCards = [...document.querySelector(".cards-stock").children];
    stockCards.forEach(function (e) {
        e.style.transform = 'rotate('+getRandom(-5, 5)+'deg) translateX('+getRandom(-10,10)+'px) translateY('+getRandom(-10,10)+'px)';
    })


    /****** TOKENS STOCK *******/
    tokenTranslate([...document.querySelector(".tokens-stock > div:nth-child(1)").children]);
    tokenTranslate([...document.querySelector(".tokens-stock > div:nth-child(2)").children]);
    tokenTranslate([...document.querySelector(".tokens-stock > div:nth-child(3)").children]);
    tokenTranslate([...document.querySelector(".tokens-stock > div:nth-child(4)").children]);
    tokenTranslate([...document.querySelector(".tokens-stock > div:nth-child(5)").children]);
    tokenTranslate([...document.querySelector(".tokens-stock > div:nth-child(6)").children]);
};

function getRandom(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min +1)) + min;
}

function tokenTranslate(dom) {
    // let tokensTranslation = 50,
    //     tokensTranslationChange = (tokensTranslation) / (dom.length-1);

    dom.forEach(function (e) {
        // e.style.transform = 'translateX('+Math.abs(tokensTranslation)+'px)' + 'translateY('+getRandom(-1,1)+'px)';
        // tokensTranslation -= tokensTranslationChange;
        e.style.transform = 'rotate('+getRandom(-2,2)+'deg)' + 'translateY('+getRandom(-1,1)+'px)';
    })
}