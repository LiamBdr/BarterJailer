<?php

namespace App\Controller;

use App\Entity\Friendship;
use App\Entity\Player;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class FriendController extends AbstractController
{
    #[Route('/friend/add/{id}', name: 'app_friend_add')]
    public function addFriend($id, ManagerRegistry $doctrine): Response
    {
        $entityManager = $doctrine->getManager();

        $friendship = new Friendship();
        $friend = $doctrine->getRepository(Player::class)->find($id);

        $friendRequestsSend = $doctrine->getRepository(Friendship::class)->findBy(
            ['user' => $this->getUser()->getId()]
        );

        //vérifie que le joueur n'est pas déjà dans les amis
        $error = false;
        foreach ($friendRequestsSend as $request) {
            if ($request->getFriend() === $friend) {
                $error = true;
                $this->addFlash(
                    'notice',
                    'Vous avez déjà ajouté ce joueur'
                );
            }
        }

        if ($id == $this->getUser()->getId()) {
            $error = true;
            $this->addFlash(
                'notice',
                'Vous ne pouvez pas vous ajouter en ami'
            );
        }

        if ($error === false) {
            $friendship->setUser($this->getUser());
            $friendship->setFriend($friend);

            $entityManager->persist($friendship);
            $entityManager->flush();
        }

        return $this->redirectToRoute('app_game_home');

    }

    #[Route('/friend/delete/{id}', name: 'app_friend_delete')]
    public function deleteFriend($id, ManagerRegistry $doctrine): Response
    {
        $entityManager = $doctrine->getManager();
        $friendToDelete = $doctrine->getRepository(Player::class)->find($id);

        //supprime l'amitié du côté du joueur
        $friendRequestsSend = $doctrine->getRepository(Friendship::class)->findBy(
            ['user' => $this->getUser()->getId()]
        );
        foreach ($friendRequestsSend as $request) {
            if ($request->getFriend() === $friendToDelete) {
                $entityManager->remove($request);
            }
        }

        //supprime l'amitié du côté de l'autre joueur
        $friendRequestsReceived = $doctrine->getRepository(Friendship::class)->findBy(
            ['friend' => $this->getUser()->getId()]
        );
        foreach ($friendRequestsReceived as $request) {
            if ($request->getUser() === $friendToDelete) {
                $entityManager->remove($request);
            }
        }

        $entityManager->flush();
        return $this->redirectToRoute('app_game_home');
    }

    #[Route('/friend/cancel/{id}', name: 'app_friend_cancel')]
    public function cancelRequest($id, ManagerRegistry $doctrine): Response
    {
        $entityManager = $doctrine->getManager();
        $requestToDelete = $doctrine->getRepository(Friendship::class)->find($id);

        $entityManager->remove($requestToDelete);
        $entityManager->flush();
        return $this->redirectToRoute('app_game_home');
    }
}
