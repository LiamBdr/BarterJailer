<?php

namespace App\Security;

use App\Entity\Player;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAccountStatusException;
use Symfony\Component\Security\Core\User\UserCheckerInterface;
use Symfony\Component\Security\Core\User\UserInterface;

class UserChecker implements UserCheckerInterface
{
    public function checkPreAuth(UserInterface $user): void
    {
        if (!$user instanceof Player) {
            return;
        }

        if (!$user->isVerified()) {
            throw new CustomUserMessageAccountStatusException('Veuillez verifier votre adresse email');
        }
    }

    public function checkPostAuth(UserInterface $user): void
    {
        if (!$user instanceof Player) {
            return;
        }

//      user account is expired, the user may be notified
//        if ($user->setLastConnection()) {
//            throw new AccountExpiredException('...');
//        }
    }
}