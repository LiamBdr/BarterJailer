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

        return $this->render('game/game.html.twig', [
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

        $game->setName('Partie du boss');
        $game->setPlayer1($this->getUser());

        //pour dev
        $player2 = $doctrine->getRepository(Player::class)->find(2);
        $game->setPlayer2($player2);

        //crée les cartes dans un tableau
        $cards = [] ;
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

        //distribue 5 cartes depuis les cartes déjà mélangées
        $player1Cards = $this->cardsDistribute($cards);
        $game->setPlayer1Cards($player1Cards);

        $player2Cards = $this->cardsDistribute($cards);
        $game->setPlayer2Cards($player2Cards);

        $market = $this->cardsDistribute($cards);
        $game->setMarket($market);

        $game->setStockCards($cards);

        $game->setPlayerTurn($game->getPlayer1()->getId());

        $game->setPlayer1Points(0);
        $game->setPlayer2Points(0);

        $entityManager->persist($game);
        $entityManager->flush();

        return $this->redirectToRoute('app_game', ['id' => $game->getId()]);
    }

    // génère les cartes avec le type
    private function cardsInit(&$cards, &$id, $type, $nombre)
    {
        for ($i = 1; $i <= $nombre; $i++) {
            $cards[] = ['id' => $id, 'type' => $type];
            $id++;
        }
    }

    // distribue cinq cartes en prenant les premières du tableau cards
    private function cardsDistribute(&$cards): array
    {
        for ($i = 1; $i <= 5; $i ++) {
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

}


