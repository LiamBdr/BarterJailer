<?php

namespace App\Controller;

use App\Entity\Game;
use App\Entity\Player;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class GameController extends AbstractController
{
    #[Route('/game', name: 'app_game_home')]
    public function index(ManagerRegistry $doctrine): Response
    {
        $games = $doctrine->getRepository(Game::class)->findAll();


        return $this->render('game/index.html.twig', [
            'games' => $games,
        ]);
    }

    #[Route('/game/plateau', name: 'app_game_test')]
    public function plateau(ManagerRegistry $doctrine): Response
    {
        $games = $doctrine->getRepository(Game::class)->find(71);

        return $this->render('game/plateau.html.twig', [
            'game' => $games,
        ]);
    }

    #[Route('/game/{id<\d+>}', name: 'app_game')]
    public function gameDisplay(ManagerRegistry $doctrine, int $id): Response
    {
        //redirection si joueur pas connecté
        if (!$this->getUser()) {
            $this->addFlash(
                'notice',
                'Vous devez être connecté pour créer une partie'
            );
            return $this->redirectToRoute('app_connexion');
        }

        $game = $doctrine->getRepository(Game::class)->find($id);

        //aucune partie trouvée
        if (!$game) {
            $this->addFlash(
                'notice',
                'Cette partie n\'existe pas'
            );
            return $this->redirectToRoute('app_game_home');
        }

        //joueurs incorrect
        if ($game->getPlayer1() !== $this->getUser() && $game->getPlayer2() !== $this->getUser()) {
            $this->addFlash(
                'notice',
                'Vous ne pouvez pas accéder à cette partie'
            );
            return $this->redirectToRoute('app_game_home');
        }

        return $this->render('game/plateau.html.twig', [
            'game' => $game
        ]);
    }

    #[Route('/game/create', name: 'app_game_create')]
    public function gameCreate(ManagerRegistry $doctrine): Response
    {
        $entityManager = $doctrine->getManager();

        //redirection si joueur pas connecté
        if (!$this->getUser()) {
            $this->addFlash(
                'notice',
                'Vous devez être connecté pour créer une partie'
            );
            return $this->redirectToRoute('app_connexion');
        }

        $game = new Game();

        //NOM DE LA PARTIE
        $game->setName('Partie du boss');

        //JOUEURS DE LA PARTIE
        $game->setPlayer1($this->getUser());
        $player2 = $doctrine->getRepository(Player::class)->find(2);
        $game->setPlayer2($player2);

        //DETERMINE AU HASARD LE JOUEUR QUI JOUE EN PREMIER
        $random = rand(1,2);
        if ($random === 1) {
            $game->setPlayerTurn($game->getPlayer1()->getId());
        } else {
            $game->setPlayerTurn($game->getPlayer2()->getId());
        }

        //INITIALISE LES POINTS
        $game->setPlayer1Points(0);
        $game->setPlayer2Points(0);

        //INITIALISE ROUND
        $game->setRound(1);

        //DATE CREATION PARTIE
        $now = new \DateTime();
        $now->setTimezone(new \DateTimeZone('Europe/Paris'));
        $now->format('Y-m-d H:i:s');
        $game->setDateCreation($now);

        //CARDS
        $cards = [];
        $id = 1;
        $this->cardsInit($cards, $id, 'diamant', 6);
        $this->cardsInit($cards, $id, 'or', 6);
        $this->cardsInit($cards, $id, 'argent', 6);
        $this->cardsInit($cards, $id, 'tissu', 8);
        $this->cardsInit($cards, $id, 'epice', 8);
        $this->cardsInit($cards, $id, 'cuir', 10);
        $this->cardsInit($cards, $id, 'chameau', 11);

        //mélange les cartes
        $this->shuffleAssoc($cards);

        $market[$cards[55]['id']] = $cards[55];
        unset($cards[55]);

        $market[$cards[54]['id']] = $cards[54];
        unset($cards[54]);

        $market[$cards[53]['id']] = $cards[53];
        unset($cards[53]);

        $market += $this->cardsDistribute($cards, 2);
        $game->setMarket($market);

        //distribue 5 cartes depuis les cartes déjà mélangées
        $player1Cards = $this->cardsDistribute($cards, 5);
        $player1Enclos = [];

        $this->chameauTest($player1Cards, $player1Enclos);
        $game->setPlayer1Cards($player1Cards);
        $game->setPlayer1Enclos($player1Enclos);

        //distribue 5 cartes depuis les cartes déjà mélangées
        $player2Cards = $this->cardsDistribute($cards, 5);
        $player2Enclos = [];

        $this->chameauTest($player2Cards, $player2Enclos);
        $game->setPlayer2Cards($player2Cards);
        $game->setPlayer2Enclos($player2Enclos);

        $game->setStockCards($cards);

        //TOKENS
        $tokens = [];
        $id = 1;
        $this->tokenInit($tokens, $id, 'diamant', 2, 7);
        $this->tokenInit($tokens, $id, 'diamant', 3, 5);
        $this->tokenInit($tokens, $id, 'or', 2, 6);
        $this->tokenInit($tokens, $id, 'or', 3, 5);
        $this->tokenInit($tokens, $id, 'argent', 5, 5);
        $this->tokenInit($tokens, $id, 'tissu', 1, 5);
        $this->tokenInit($tokens, $id, 'tissu', 2, 3);
        $this->tokenInit($tokens, $id, 'tissu', 2, 2);
        $this->tokenInit($tokens, $id, 'tissu', 2, 1);
        $this->tokenInit($tokens, $id, 'epice', 1, 5);
        $this->tokenInit($tokens, $id, 'epice', 2, 3);
        $this->tokenInit($tokens, $id, 'epice', 2, 2);
        $this->tokenInit($tokens, $id, 'epice', 2, 1);
        $this->tokenInit($tokens, $id, 'cuir', 1, 4);
        $this->tokenInit($tokens, $id, 'cuir', 1, 3);
        $this->tokenInit($tokens, $id, 'cuir', 1, 2);
        $this->tokenInit($tokens, $id, 'cuir', 6, 1);
        $game->setStockTokens($tokens);


        //BONUS TOKENS
        $bonusTokens = [];
        $id = 1;
        //7 bonus token de type 3 (cartes vendues)
        $this->bonusTokenInit($bonusTokens, $id, 3, 1, 2);
        $this->bonusTokenInit($bonusTokens, $id, 3, 2, 3);
        $this->bonusTokenInit($bonusTokens, $id, 3, 3, 2);

        //7 bonus token de type 4 (cartes vendues)
        $this->bonusTokenInit($bonusTokens, $id, 4, 4, 2);
        $this->bonusTokenInit($bonusTokens, $id, 4, 5, 2);
        $this->bonusTokenInit($bonusTokens, $id, 4, 6, 2);

        //7 bonus token de type 5 (cartes vendues)
        $this->bonusTokenInit($bonusTokens, $id, 5, 8, 2);
        $this->bonusTokenInit($bonusTokens, $id, 5, 9, 1);
        $this->bonusTokenInit($bonusTokens, $id, 5, 10, 2);
        $game->setStockBonusTokens($bonusTokens);

        //crée la partie dans bdd
        $entityManager->persist($game);
        $entityManager->flush();

        return $this->redirectToRoute('app_game', ['id' => $game->getId()]);
    }

    // génère les cartes
    private function cardsInit(&$cards, &$id, $type, $nombre)
    {
        for ($i = 1; $i <= $nombre; $i++) {
            $cards[] = ['id' => $id, 'type' => $type];
            $id++;
        }
    }

    // génère les jetons
    private function tokenInit(&$tokens, &$id, $type, $nombre, $val)
    {
        for ($i = 1; $i <= $nombre; $i++) {
            $tokens[$id] = ['id' => $id, 'type' => $type, 'val' => $val];
            $id++;
        }
    }

    private function bonusTokenInit(&$bonusTokens, &$id, $type, $val, $nombre)
    {
        for ($i = 1; $i <= $nombre; $i++) {
            $bonusTokens[$id] = ['id' => $id, 'type' => $type, 'val' => $val];
            $id++;
        }
    }

    // distribue cinq cartes en prenant les premières du tableau cards
    private function cardsDistribute(&$cards, $nombre): array
    {
        for ($i = 1; $i <= $nombre; $i ++) {
            $randomCards = array_pop($cards);
            $array[$randomCards['id']] = $randomCards;
        }

        return $array;
    }

    // mélange les cartes en gardant les clés associatives dans le tableau des cards
    private function shuffleAssoc(&$array): void
    {
        $keys = array_keys($array);

        shuffle($keys);

        foreach($keys as $key) {
            $new[$key+1] = $array[$key];
        }

        $array = $new;
    }

    // vérifie la présence de chameaux dans les cartes des joueurs pour les envoyer dans l'enclos
    private function chameauTest(&$playerCards, &$playerEnclos): void
    {
        foreach ($playerCards as $singleCard) {
            if ($singleCard['type'] === 'chameau') {
                $playerEnclos[$singleCard['id']] = $singleCard;
                unset($playerCards[$singleCard['id']]);
            }
        }
    }

}


