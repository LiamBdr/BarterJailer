<?php

namespace App\Security;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Http\Event\InteractiveLoginEvent;
use App\Entity\Player;

class LoginListener
{
    protected $em;

    public function __construct(EntityManagerInterface $entityManager){
        $this->em = $entityManager;
    }

    public function onSecurityInteractiveLogin(InteractiveLoginEvent $event)
    {
        $user = $event->getAuthenticationToken()->getUser();

        if($user instanceof Player){
            $now = new \DateTime();
            $now->setTimezone(new \DateTimeZone('Europe/Paris'));
            $now->format('Y-m-d H:i:s');

            $user->setLastConnection($now);
            $this->em->persist($user);
            $this->em->flush();
        }
    }

//    public function onSuccessfulLogin(AuthenticationEvent $event)
//    {
//        $user = $event->getAuthenticationToken()->getUser();
//        if($user instanceof Player){
//            $user->setLastConnection();
//            $this->entityManager->persist($user);
//            $this->entityManager->flush();
//        }
//    }

//    public function onLoginError(AuthenticationEvent $event)
//    {
//        // Login error
//    }
}