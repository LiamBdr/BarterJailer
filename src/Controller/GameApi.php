<?php

namespace App\Controller;

use App\Entity\Game;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Config\Definition\Exception\Exception;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

class GameApi extends AbstractController
{

    #[Route('/game/api/validTurn/{id}', name: 'app_game_api_exchange', methods: ['POST'])]
    public function validTurn($id, ManagerRegistry $doctrine, Request $request): Response
    {
        //variables de la requête
        $data = json_decode($request->getContent(), true);
        //$data['selectedSellCards']
        //$data['selectedTakeCards']

        //variables du jeu
        $game = $this->secureRequest($doctrine, $id);
        $market = $game->getMarket();
        $stockCards = $game->getStockCards();
        $stockTokens = $game->getStockTokens();
        $stockBonusTokens = $game->getStockBonusTokens();
        $defausse = $game->getDefausse();

        if ($game->getPlayer1() === $this->getUser()) {  //player1
            $playerCards = $game->getPlayer1Cards();
            $playerTokens = $game->getPlayer1Tokens();
            $playerBonusTokens = $game->getPlayer1BonusTokens();
            $playerEnclos = $game->getPlayer1Enclos();
            $playerPoints = $game->getPlayer1Points();
        } else { //player2
            $playerCards = $game->getPlayer2Cards();
            $playerTokens = $game->getPlayer2Tokens();
            $playerBonusTokens = $game->getPlayer2BonusTokens();
            $playerEnclos = $game->getPlayer2Enclos();
            $playerPoints = $game->getPlayer2Points();
        }

        $error = false;

        //VÉRIFIE QU'IL Y AI DES CARTES DE SÉLECTIONNÉES
        if (count($data['selectedSellCards']) > 0 || count($data['selectedTakeCards']) > 0) {

            //le joueur a sélectionnée des cartes à vendre
            if (count($data['selectedSellCards']) > 0) {

                /******* ÉCHANGE DE CARTES *******/
                //le joueur a sélectionné des cartes à échanger
                if (count($data['selectedTakeCards']) > 0) {

                    //vérifie qu'il y ai le même nombre de cartes à échanger et qu'il y ai au moins 2 cartes à échanger
                    if ((count($data['selectedTakeCards']) !== count($data['selectedSellCards']) ) ||  count($data['selectedTakeCards']) < 2 || count($data['selectedSellCards']) < 2) {
                        $error = 'Il n\' y a pas le même nombre de cartes à échanger';
                    }

                    //vérifie qu'il n'y ai pas de chameaux dans les cartes à prendre
                    foreach ($data['selectedTakeCards'] as $card) {
                        if ($card['type'] === 'chameau') {
                            $error = 'Il y a un chameau dans les cartes à échanger';
                        }
                    }

                    //vérifie que le joueur ne dépasse pas 7 cartes
                    $sellCount = 0;
                    foreach ($data['selectedSellCards'] as $card) {
                        if ($card['type'] === 'chameau') {
                            $sellCount++;
                        }
                    }

                    //erreur si le joueur aura plus de 7 cartes
                    if ((count($playerCards)+$sellCount) > 7) {
                        $error = 'Le joueur ne peut pas avoir plus de 7 cartes';
                    }

                    //vérifie que le joueur ne troc pas le même type de carte
                    $tampArray = [];
                    foreach ($data['selectedTakeCards'] as $card) {
                        $tampArray[] = $card;
                    };
                    for ($i = 0; $i < count($data['selectedTakeCards']); $i++) {
                        foreach ($data['selectedSellCards'] as $card) {
                            if ($card['type'] === $tampArray[$i]['type']) {
                                $error = 'le joueur ne peut pas échanger le même type de cartes';
                            }
                        }
                    }

                    if ($error === false) {

                        //PLACES LES CARTES DU JOUEUR AU MARCHÉ
                        foreach ($data['selectedSellCards'] as $card) {
                            $market[$card['id']] = $card; //ajoute la carte du joueur dans le marché
                            if ($card['type'] === 'chameau') {
                                unset($playerEnclos[$card['id']]); //enlève la carte du joueur de sa main
                            } else {
                                unset($playerCards[$card['id']]); //enlève la carte du joueur de sa main
                            }
                        }

                        //PLACE LES CARTES DU MARCHÉ DANS LA MAIN DU JOUEUR
                        foreach ($data['selectedTakeCards'] as $card) {
                            $playerCards[$card['id']] = $card;
                            unset($market[$card['id']]);
                        }

                    }

                }
                /******* VENTE DE CARTES *******/
                //le joueur n'a pas sélectionné de carte à échanger
                else {


                    $tampArray = [];
                    foreach ($data['selectedSellCards'] as $card) {
                        $tampArray[] = $card;
                    };

                    $rareTest = 0;
                    //test pour que les marchandises soient du même type et pas un chameau
                    for ($i = 0; $i < count($tampArray); $i++) {
                        foreach ($data['selectedSellCards'] as $card) {
                            if ($tampArray[$i]['type'] !== $card['type']) {
                                $error = 'Vous devez vendre des marchandises de même type';
                            }

                            if ($card['type'] === 'chameau') {
                                $error = 'Vous ne pouvez pas vendre de chameau';
                            }

                            if ($card['type'] === 'diamant' || $card['type'] === 'or' || $card['type'] === 'argent') {
                                $rareTest++;
                            }
                        }
                    }


                    if ($rareTest > 0 && $rareTest < 2) {
                        $error = 'Vous ne pouvez pas vendre une seule marchandise rare';
                    }

                    if ($error === false) {


                        //AJOUT DE TOKEN BONUS
                        if (count($data['selectedSellCards']) === 3) {
                            $this->getRandomBonusToken($stockBonusTokens, $playerBonusTokens,$playerPoints, 3);
                        }
                        if (count($data['selectedSellCards']) === 4) {
                            $this->getRandomBonusToken($stockBonusTokens, $playerBonusTokens,$playerPoints, 4);
                        }
                        if (count($data['selectedSellCards']) === 5) {
                            $this->getRandomBonusToken($stockBonusTokens, $playerBonusTokens,$playerPoints, 5);
                        }

                        //pour chaque carte vendu
                        //AJOUT DE TOKEN
                        foreach ($data['selectedSellCards'] as $card) {
                            $tokenTest = false;
                            foreach ($stockTokens as $token) {
                                if ($token['type'] === $card['type'] && $tokenTest === false) {
                                    $tokenTest = true;
                                    $playerTokens[$token['id']] = $token; //rajout le jeton dans la main du joueur
                                    unset($stockTokens[$token['id']]); //enlève le jeton du stock
                                    $defausse[$card['id']] = $card; //rajoute la carte dans la défausse
                                    unset($playerCards[$card['id']]); //enlève la carte de la main du joueur
                                    unset($data['selectedSellCards'][$card['id']]); //enlève la carte de la main du joueur
                                    $playerPoints += intval($token['val']);
                                }
                            }
                        }

                        //vends les cartes mêmes si il manque des jetons
                        if (count($data['selectedSellCards']) > 0) {
                            foreach ($data['selectedSellCards'] as $card) {
                                $defausse[$card['id']] = $card; //rajoute la carte dans la défausse
                                unset($playerCards[$card['id']]); //enlève la carte de la main du joueur
                            }
                        }

                        //VÉRIFIE QU'IL Y AI ENCORE DES JETONS DANS CHAQUE TYPE
                        $diamant = [];
                        $or = [];
                        $argent = [];
                        $tissu = [];
                        $epice = [];
                        $cuir = [];
                        foreach ($stockTokens as $token) { //boucles dans tous les jetons du stock
                            if ($token['type'] === 'diamant') {
                                $diamant[] = $token;
                            }

                            if ($token['type'] === 'or') {
                                $or[] = $token;
                            }

                            if ($token['type'] === 'argent') {
                                $argent[] = $token;
                            }

                            if ($token['type'] === 'tissu') {
                                $tissu[] = $token;
                            }

                            if ($token['type'] === 'epice') {
                                $epice[] = $token;
                            }

                            if ($token['type'] === 'cuir') {
                                $cuir[] = $token;
                            }
                        }

                        $emptyType = 0;
                        $countTokens = [count($diamant), count($or), count($argent), count($tissu), count($epice), count($cuir)];

                        foreach ($countTokens as $count) {
                            if ($count <= 0) {
                                $emptyType++;
                            }
                        }

                        if ($emptyType >= 3) {
                            $error = 'end';
                        }
                    }
                }

            }
            // le joueur n'a pas sélectionné de cartes à vendre ou échanger
            else {

                /******* PRENDRE UNE SEULE MARCHANDISE *******/
                //si le joueur a sélectionné une seule carte
                if (count($data['selectedTakeCards']) === 1) {

                    if ((count($playerCards) + 1) > 7) {
                        $error = 'Vous ne pouvez pas avoir plus de 7 cartes';
                    }

                    if ($error === false) {
                        foreach ($data['selectedTakeCards'] as $card) {
                            if ($card['type'] === 'chameau') {
                                $playerEnclos[$card['id']] = $card;
                            } else {
                                $playerCards[$card['id']] = $card;
                            }
                            unset($market[$card['id']]);
                            $this->piocherCards(1, $stockCards, $market, $error);
                        }
                    }

                }
                /******* PRENDRE TOUS LES CHAMEAUX *******/
                else { //le joueur a plusieurs cartes à prendre

                    foreach ($data['selectedTakeCards'] as $card) {
                        if ($card['type'] !== 'chameau') {
                            $error = 'Vous ne pouvez pas prendre plusieurs type de marchandise';
                        }
                    }

                    if ($error === false) {

                        //Récupère tous les chameaux et les supprimes du marché
                        foreach ($data['selectedTakeCards'] as $card) {
                            $playerEnclos[$card['id']] = $card;
                            unset($market[$card['id']]);
                        }

                        $this->piocherCards(count($data['selectedTakeCards']), $stockCards, $market, $error);

                    }

                }

            }




        } else {
            $error = "Il n'y a aucune carte sélectionnée";
        }


        if ($error === false || $error === 'end') {

            $game->setMarket($market);
            $game->setStockCards($stockCards);
            $game->setStockTokens($stockTokens);
            $game->setStockBonusTokens($stockBonusTokens);
            $game->setDefausse($defausse);

            if ($game->getPlayer1() === $this->getUser()) {  //player1
                $game->setPlayer1Cards($playerCards);
                $game->setPlayer1Tokens($playerTokens);
                $game->setPlayer1BonusTokens($playerBonusTokens);
                $game->setPlayer1Enclos($playerEnclos);
                $game->setPlayer1Points($playerPoints);
            } else { //player2
                $game->setPlayer2Cards($playerCards);
                $game->setPlayer2Tokens($playerTokens);
                $game->setPlayer2BonusTokens($playerBonusTokens);
                $game->setPlayer2Enclos($playerEnclos);
                $game->setPlayer2Points($playerPoints);
            }

             $this->changeTurn($game);

            //FINIE LE ROUND
            if($error === 'end') {

                //compte les points du joueur 1
                $player1Points = 0;
                //compte les tokens
                foreach ($game->getPlayer1Tokens() as $token) {
                    $player1Points += intval($token['val']);
                }
                //compte les tokens bonus
                foreach ($game->getPlayer1BonusTokens() as $bonusToken) {
                    $player1Points += intval($bonusToken['val']);
                }

                //compte les points du joueur 1
                $player2Points = 0;
                //compte les tokens
                foreach ($game->getPlayer2Tokens() as $token) {
                    $player2Points += intval($token['val']);
                }
                //compte les tokens bonus
                foreach ($game->getPlayer2BonusTokens() as $bonusToken) {
                    $player2Points += intval($bonusToken['val']);
                }

                //désigne le joueur qui a le plus de chameaux dans son enclos
                if (count($game->getPlayer1Enclos()) > count($game->getPlayer2Enclos())) {
                    $player1Points += 5;
                } else if (count($game->getPlayer1Enclos()) < count($game->getPlayer2Enclos())) {
                    $player2Points += 5;
                }

                //DÉSIGNE LE GAGNANT EN FONCTION DES POINTS
                $victoryPlayer1 = intval($game->getPlayer1Victory());
                $victoryPlayer2 = intval($game->getPlayer2Victory());
                if ($player1Points > $player2Points) { //le joueur 1 a plus de points
                    $game->setPlayer1Victory($victoryPlayer1+1);
                } else if (($player2Points > $player1Points)) { //le joueur 2 a plus de points
                    $game->setPlayer2Victory($victoryPlayer2+1);
                } else {

                    //égalité
                    if (count($game->getPlayer1BonusTokens()) > count($game->getPlayer2BonusTokens())) {
                        $game->setPlayer1Victory($victoryPlayer1+1);
                    } else if (count($game->getPlayer2BonusTokens()) > count($game->getPlayer1BonusTokens())) {
                        $game->setPlayer1Victory($victoryPlayer2+1);
                    } else {

                        //égalité
                        if (count($game->getPlayer1Tokens()) > count($game->getPlayer2Tokens())) {
                            $game->setPlayer1Victory($victoryPlayer1+1);
                        } else  {
                            $game->setPlayer1Victory($victoryPlayer2+1);
                        }
                    }

                }

                //augmente le round
                $game->setRound($game->getRound() + 1);
            }

            $entityManager = $doctrine->getManager();
            $entityManager->persist($game);
            $entityManager->flush();

            return $this->json($game);
        }
        else {
            return $this->json($error);
        }





    }

    private function secureRequest($doctrine, $id) : Game {

        //redirection si joueur pas connecté
        if (!$this->getUser()) {
            throw new Exception('Utilisateur non connecté');
        }

        //récupération de la partie
        $game = $doctrine->getRepository(Game::class)->find($id);

        //erreur si aucune partie trouvée
        if (!$game) {
            throw new Exception('Aucune partie');
        }

        //si joueur fait bien partie de la partie
        if($game->getPlayer1() === $this->getUser() || $game->getPlayer2() === $this->getUser()) {
            return $game;
        } else {
            throw new Exception('Le joueur n\'appartient pas à la partie');
        }
    }

    private function changeTurn(Game $game) {

        //change le tour du joueur
        if ( $this->getUser() === $game->getPlayer1() ) { //player1
            $game->setPlayerTurn($game->getPlayer2()->getId());
        } else { //player2
            $game->setPlayerTurn($game->getPlayer1()->getId());
        }
    }

    private function piocherCards($num, &$stockCards, &$market, &$error) {

        //boucle pour piocher les cartes
            for ($i = 1; $i <= $num; $i++) {
                //vérifie qu'il y a des cartes
                if(count($stockCards) > 0 && count($market) < 5) {
                    $randomCard = $stockCards[array_rand($stockCards)];
                    $market[$randomCard['id']] = $randomCard;
                    unset($stockCards[$randomCard['id']]);
                }
            }

        if(count($stockCards) <= 0) {
            $error = 'end';
        }

    }

    private function getRandomBonusToken(&$stockBonusTokens, &$playerBonusTokens, &$playerPoints, $type) {

        $notEmpty = false;
        foreach ($stockBonusTokens as $bonusToken) {
            if ($bonusToken['type'] === $type) {
                $notEmpty = true;
            }
        }

        //vérifie qu'il y a encore des tokens bonus avec le type demandé
        if ($notEmpty === true) {
            //sélectionne un bonus token au hasard
            $randomBonusTokens = $stockBonusTokens[array_rand($stockBonusTokens)];
            if ($randomBonusTokens['type'] === $type) {
                $playerBonusTokens[$randomBonusTokens['id']] = $randomBonusTokens; //rajout le jeton dans la main du joueur
                unset($stockBonusTokens[$randomBonusTokens['id']]); //enlève le jeton du stock
                $playerPoints += intval($randomBonusTokens['val']); //augmente les points du joueur
            }
            //recommence si le token n'est pas du type demandé
            else {
                $this->getRandomBonusToken($stockBonusTokens,$playerBonusTokens,$playerPoints, $type);
            }
        }

    }

}


