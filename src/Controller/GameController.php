<?php

namespace App\Controller;

use App\Entity\Game;
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

        function cardsInit(&$cards, &$id, $type, $nombre) {
            for ($i = 1; $i <= $nombre; $i++) {
                $cards[] = ['id' => $id, 'type' => $type];
                $id++;
            }
        }

        //crée les cartes dans un tableau
        $cards = [] ;
        $id = 0;
        cardsInit($cards, $id, 'diamant', 6);
        cardsInit($cards, $id, 'or', 6);
        cardsInit($cards, $id, 'argent', 6);
        cardsInit($cards, $id, 'tissu', 8);
        cardsInit($cards, $id, 'epice', 8);
        cardsInit($cards, $id, 'cuir', 10);
        cardsInit($cards, $id, 'chameau', 11);

        //distribue les cartes
        $player1Cards = $this->cardsDistribute($cards);
        $game->setPlayer1Cards($player1Cards);

        $player2Cards = $this->cardsDistribute($cards);
        $game->setPlayer2Cards($player2Cards);

        $market = $this->cardsDistribute($cards);
        $game->setMarket($market);

        $object = json_decode(json_encode($cards));

        $game->setStockCards($cards);

        $game->setPlayerTurn(1);

        $game->setPlayer1Points(0);
        $game->setPlayer2Points(0);


        $entityManager->persist($game);
        $entityManager->flush();

        return $this->redirectToRoute('app_game', ['id' => $game->getId()]);
    }

    private function shuffleAssoc(&$array): void
    {
        $keys = array_keys($array);

        shuffle($keys);

        foreach($keys as $key) {
            $new[$key] = $array[$key];
        }

        $array = $new;
    }

    private function cardsDistribute(&$cards): array
    {
        //mélange les cartes
        $this->shuffleAssoc($cards);

        for ($i = 1; $i <= 5; $i ++) {
            $randomCards = array_pop($cards);
            $playerCards[$randomCards['id']] = $randomCards;
        }

        return $playerCards;
    }

}


