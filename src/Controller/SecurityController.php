<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Authentication\AuthenticationUtils;

class SecurityController extends AbstractController
{
    #[Route(path: '/admin/login', name: 'app_admin_login')]
    public function login(AuthenticationUtils $authenticationUtils): Response
    {
        if ($this->getUser()) {
             return $this->redirectToRoute('admin');
         }

        $error = $authenticationUtils->getLastAuthenticationError();

        return $this->render('security/login.html.twig', ['error' => $error]);
    }

    #[Route(path: '/admin/logout', name: 'app_admin_logout')]
    public function logout(): void
    {
        throw new \LogicException('Admin Logout Exception');
    }
}
