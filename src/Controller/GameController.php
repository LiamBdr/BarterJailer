<?php

namespace App\Controller;

use App\Entity\Friendship;
use App\Entity\Game;
use App\Entity\Player;
use Doctrine\ORM\EntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class GameController extends AbstractController
{
    #[Route('/game', name: 'app_game_home')]
    public function index(ManagerRegistry $doctrine): Response
    {
        $games = $doctrine->getRepository(Game::class)->findAll(
        );

        $allPlayers = $doctrine->getRepository(Player::class)->findAll();

        // toutes les demandes d'amis que le joueur a envoyé
        $friendRequestsSend = $doctrine->getRepository(Friendship::class)->findBy(
            ['user' => $this->getUser()->getId()]
        );

        // toutes les demandes d'amis que le joueur a reçu
        $friendRequestsReceived = $doctrine->getRepository(Friendship::class)->findBy(
            ['friend' => $this->getUser()->getId()]
        );

        $friends = [];

        //pour chaque demande envoyé
        foreach ($friendRequestsSend as $sendRequest) {
            //pour chaque demande reçu
            foreach ($friendRequestsReceived as $receivedRequest) {

                if ($sendRequest->getFriend() === $receivedRequest->getUser()) {
                    $friends[] = $sendRequest;

                    if (($key = array_search($sendRequest, $friendRequestsSend)) !== false) {
                        unset($friendRequestsSend[$key]);
                    }

                    if (($key = array_search($receivedRequest, $friendRequestsReceived)) !== false) {
                        unset($friendRequestsReceived[$key]);
                    }

                }

            }
        }

        //supprime le joueur de tous les joueurs
        if (($key = array_search($this->getUser(), $allPlayers)) !== false) {
            unset($allPlayers[$key]);
        }

        foreach ($friends as $request) {
            if (($key = array_search($request->getFriend(), $allPlayers)) !== false) {
                unset($allPlayers[$key]);
            }
        }

        foreach ($friendRequestsReceived as $request) {
            if (($key = array_search($request->getUser(), $allPlayers)) !== false) {
                unset($allPlayers[$key]);
            }
        }

        foreach ($friendRequestsSend as $request) {
            if (($key = array_search($request->getFriend(), $allPlayers)) !== false) {
                unset($allPlayers[$key]);
            }
        }


        return $this->render('game/index.html.twig', [
            'games' => $games,
            'allPlayers' => $allPlayers,
            'friends' => $friends,
            'sentPendingRequest' => $friendRequestsSend,
            'receivedPendingRequest' => $friendRequestsReceived
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
    public function gameCreate(ManagerRegistry $doctrine, Request $request): Response
    {

        //redirection si joueur pas connecté
        if (!$this->getUser()) {
            $this->addFlash(
                'notice',
                'Vous devez être connecté pour créer une partie'
            );
            return $this->redirectToRoute('app_connexion');
        }

        $allPlayers = $doctrine->getRepository(Player::class)->findAll();

        // toutes les demandes d'amis que le joueur a envoyé
        $friendRequestsSend2 = $doctrine->getRepository(Friendship::class)->findBy(
            ['user' => $this->getUser()]
        );
        // toutes les demandes d'amis que le joueur a reçu
        $friendRequestsReceived2 = $doctrine->getRepository(Friendship::class)->findBy(
            ['friend' => $this->getUser()]
        );

        $friends = [];
        //pour chaque demande envoyé
        foreach ($friendRequestsSend2 as $sendRequest) {
            //pour chaque demande reçu
            foreach ($friendRequestsReceived2 as $receivedRequest) {
                if ($sendRequest->getFriend() === $receivedRequest->getUser()) {
                    $friends[] = $sendRequest->getFriend();
                }
            }
        }

        $entityManager = $doctrine->getManager();

        $game = new Game();

        $form = $this->createFormBuilder($game)
            ->add('name', TextType::class, ['label' => 'Nom de la cellule'])
            ->add('player2', EntityType::class, [
                'label' => 'Gardien adverse',
                'class' => Player::class,
                'choice_label' => 'username',
                'choices' => $friends,
                'multiple' => false,
                'expanded' => false,
            ])
            ->getForm();

        $form->handleRequest($request);

        //si formulaire complété
        if ($form->isSubmitted() && $form->isValid()) {

            //JOUEURS DE LA PARTIE
            $game->setPlayer1($this->getUser());

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


        return $this->renderForm('game/create-game-form.html.twig', [
            'form' => $form,
        ]);

    }

    #[Route('/game/delete/{id<\d+>}', name: 'app_game_delete')]
    public function gameDelete(ManagerRegistry $doctrine, int $id): Response
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
                'Vous ne pouvez pas supprimer cette partie'
            );
            return $this->redirectToRoute('app_game_home');
        }

        $entityManager = $doctrine->getManager();

        //crée la partie dans bdd
        $entityManager->remove($game);
        $entityManager->flush();

        return $this->redirectToRoute('app_game_home');
    }

    #[Route('/game/get/games', name: 'app_game_get_games')]
    public function getGames(ManagerRegistry $doctrine): Response
    {
        //redirection si joueur pas connecté
        if (!$this->getUser()) {
            $this->addFlash(
                'notice',
                'Vous devez être connecté pour créer une partie'
            );
            return $this->redirectToRoute('app_connexion');
        }

        $games = $doctrine->getRepository(Game::class)->findAll(
        );

        $allPlayers = $doctrine->getRepository(Player::class)->findAll();

        // toutes les demandes d'amis que le joueur a envoyé
        $friendRequestsSend = $doctrine->getRepository(Friendship::class)->findBy(
            ['user' => $this->getUser()->getId()]
        );

        // toutes les demandes d'amis que le joueur a reçu
        $friendRequestsReceived = $doctrine->getRepository(Friendship::class)->findBy(
            ['friend' => $this->getUser()->getId()]
        );

        $friends = [];

        //pour chaque demande envoyé
        foreach ($friendRequestsSend as $sendRequest) {
            //pour chaque demande reçu
            foreach ($friendRequestsReceived as $receivedRequest) {

                if ($sendRequest->getFriend() === $receivedRequest->getUser()) {
                    $friends[] = $sendRequest;

                    if (($key = array_search($sendRequest, $friendRequestsSend)) !== false) {
                        unset($friendRequestsSend[$key]);
                    }

                    if (($key = array_search($receivedRequest, $friendRequestsReceived)) !== false) {
                        unset($friendRequestsReceived[$key]);
                    }

                }

            }
        }

        //supprime le joueur de tous les joueurs
        if (($key = array_search($this->getUser(), $allPlayers)) !== false) {
            unset($allPlayers[$key]);
        }

        foreach ($friends as $request) {
            if (($key = array_search($request->getFriend(), $allPlayers)) !== false) {
                unset($allPlayers[$key]);
            }
        }

        foreach ($friendRequestsReceived as $request) {
            if (($key = array_search($request->getUser(), $allPlayers)) !== false) {
                unset($allPlayers[$key]);
            }
        }

        foreach ($friendRequestsSend as $request) {
            if (($key = array_search($request->getFriend(), $allPlayers)) !== false) {
                unset($allPlayers[$key]);
            }
        }

        $datas = [];

        $datas['games'] = $games;
        $datas['allPlayers'] = $allPlayers;
        $datas['friends'] = $friends;
        $datas['requestsSend'] = $friendRequestsSend;
        $datas['requestsReceived'] = $friendRequestsReceived;

        return $this->json($datas);
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


