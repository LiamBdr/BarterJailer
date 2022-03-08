<?php

namespace App\Controller\Admin;

use App\Entity\Player;
use EasyCorp\Bundle\EasyAdminBundle\Config\Dashboard;
use EasyCorp\Bundle\EasyAdminBundle\Config\MenuItem;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractDashboardController;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class DashboardController extends AbstractDashboardController
{
    #[Route('/admin', name: 'admin')]
    public function index(): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $adminUrlGenerator = $this->container->get(AdminUrlGenerator::class);

        return $this->redirect($adminUrlGenerator->setController(PlayerCrudController::class)->generateUrl());
    }

    public function configureDashboard(): Dashboard
    {
        return Dashboard::new()
            ->setTitle('<img src="images/svg/favicon.svg" style="display: block; width: 50%; margin: auto; filter: drop-shadow(0 5px 10px rgba(0,0,0,0.2))">')

            ->setFaviconPath('images/svg/favicon.svg');
    }

    public function configureMenuItems(): iterable
    {
        return [
            MenuItem::linkToRoute('Retour à l\'accueil', 'fa fa-arrow-left', 'app_home'),
            MenuItem::linkToDashboard('Dashboard', 'fa fa-home'),

            MenuItem::section('Users'),
            MenuItem::linkToCrud('Joueurs', 'fa fa-user', Player::class),

            MenuItem::section('Parties'),
        ];
    }

}
