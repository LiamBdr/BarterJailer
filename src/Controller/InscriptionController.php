<?php

namespace App\Controller;

use App\Entity\Player;
use App\Form\InscriptionFormType;
use App\Repository\PlayerRepository;
use App\Security\EmailVerifier;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use SymfonyCasts\Bundle\VerifyEmail\Exception\VerifyEmailExceptionInterface;

class InscriptionController extends AbstractController
{
    private EmailVerifier $emailVerifier;

    public function __construct(EmailVerifier $emailVerifier)
    {
        $this->emailVerifier = $emailVerifier;
    }

    #[Route('/inscription', name: 'app_register')]
    public function register(Request $request, UserPasswordHasherInterface $userPasswordHasher, EntityManagerInterface $entityManager): Response
    {
        //redirection si joueur déjà connecté
        if ($this->getUser()) {
            $this->addFlash(
                'notice',
                'Vous êtes déjà inscrit !'
            );
            return $this->redirectToRoute('app_home');
        }

        //génération du formulaire d'inscription
        $user = new Player();
        $form = $this->createForm(InscriptionFormType::class, $user);
        $form->handleRequest($request);

        //si formulaire complété
        if ($form->isSubmitted() && $form->isValid()) {

            //hachage du mot de passe
            $user->setPassword(
                $userPasswordHasher->hashPassword(
                        $user,
                        $form->get('plainPassword')->getData()
                    )
            );

            //heure actuelle
            $now = new \DateTime();
            $now->setTimezone(new \DateTimeZone('Europe/Paris'));
            $now->format('Y-m-d H:i:s');

            //set données du joueur
            $user->setDateInscription($now);
            $user->setLastConnection($now);
            $user->setState(0);

            //envoie joueur dans bdd
            $entityManager->persist($user);
            $entityManager->flush();

            //envoie mail de confirmation
            $this->emailVerifier->sendEmailConfirmation('app_verify_email', $user,
                (new TemplatedEmail())
                    ->to($user->getEmail())
                    ->subject('Confirmez votre adresse mail !')
                    ->priority(Email::PRIORITY_HIGH)
                    ->htmlTemplate('emails/inscription.html.twig')
                    ->context([
                        'player' => $user
                    ])
            );

            $this->addFlash(
                'notice',
                'Inscription prise en compte, veuillez consulter votre adresse email'
            );

            return $this->redirectToRoute('app_home');
        }

        //affichage du formulaire
        return $this->render('user/inscription.html.twig', [
            'registrationForm' => $form->createView(),
        ]);
    }

    #[Route('/verify/email', name: 'app_verify_email')]
    public function verifyUserEmail(Request $request, PlayerRepository $playerRepository): Response
    {
        $id = $request->get('id');

        if (null === $id) {
            return $this->redirectToRoute('app_register');
        }

        $user = $playerRepository->find($id);

        if (null === $user) {
            return $this->redirectToRoute('app_register');
        }

        // validate email confirmation link, sets User::isVerified=true and persists
        try {
            $this->emailVerifier->handleEmailConfirmation($request, $user);
        } catch (VerifyEmailExceptionInterface $exception) {
            $this->addFlash('verify_email_error', $exception->getReason());

            return $this->redirectToRoute('app_register');
        }

        $this->addFlash(
            'notice',
            'Votre adresse email est validée !'
        );

        return $this->redirectToRoute('app_home');
    }
}
