<?php

namespace App\Controller;

use App\Repository\PlayerRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\RepeatedType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Validator\Constraints\Length;
use SymfonyCasts\Bundle\ResetPassword\Controller\ResetPasswordControllerTrait;
use SymfonyCasts\Bundle\ResetPassword\ResetPasswordHelperInterface;

class AccountController extends AbstractController
{
    use ResetPasswordControllerTrait;

    #[Route('/profil/{id<\d+>}', name: 'app_account', defaults: ['id' => 0], methods: ['GET', 'POST'])]
    public function getProfil(PlayerRepository $playerRepository, int $id, Request $request): Response
    {
        if ($id === 0) {
            $id = $this->getUser()->getId();
        }

        $player = $playerRepository->find($id);

        if (!$player) {
            $this->addFlash(
                'notice',
                'Aucun joueur avec cet identifiant !'
            );
            return $this->redirectToRoute('app_account');
        }

        return $this->render('user/profil.html.twig', [
            'player' => $player
        ]);
    }

    #[Route('/profil/update', name: 'app_account_update')]
    public function updateProfil(EntityManagerInterface $entityManager, Request $request, UserPasswordHasherInterface $userPasswordHasher): Response
    {
        //génération du formulaire
        $player = $this->getUser();

        $form = $this->createFormBuilder($player)
            ->add('username', TextType::class)
            ->add('firstname', TextType::class)
            ->add('lastname', TextType::class)
            ->add('avatar', ChoiceType::class, [
                'expanded' => true,
                'required' => true,
                'choices' => [
                    'Jean-greg' => 'jean-greg',
                    'Joy' => 'joy',
                    'Jules' => 'jules',
                    'Kim' => 'kim',
                    'Marcel' => 'marcel',
                    'Mathis' => 'mathis'
                ],
                'choice_attr' => function($choice, $key) {
                    if ($key == 'Armand') {
                        return ['checked' => true];
                    }
                    return ['checked' => false];
                }
            ])
            ->add('plainPassword', RepeatedType::class, [
                'type' => PasswordType::class,
                'mapped' => false,
                'invalid_message' => 'Les mots de passe doivent être identiques',
                'options' => ['attr' => ['class' => 'password-field']],
                'required' => false,
                'first_options'  => ['label' => 'Nouveau mot de passe'],
                'second_options' => ['label' => 'Confirmez le mot de passe'],
                'constraints' => [
                    new Length([
                        'min' => 6,
                        'minMessage' => 'Votre mot de passe doit contenir au moins {{ limit }} caractères',
                        'max' => 4096,
                    ]),
                ],
            ])
            ->getForm();

        $form->handleRequest($request);

        //si formulaire complété
        if ($form->isSubmitted() && $form->isValid()) {

            $player = $form->getData();

            if ($form->get('plainPassword')->getData() != null) {
                // Encode(hash) the plain password, and set it.
                $encodedPassword = $userPasswordHasher->hashPassword(
                    $player,
                    $form->get('plainPassword')->getData()
                );

                $player->setPassword($encodedPassword);
            }

            // The session is cleaned up after the password has been changed.
            $this->cleanSessionAfterReset();

            //envoie joueur dans bdd
            $entityManager->persist($player);
            $entityManager->flush();

            $this->addFlash(
                'notice',
                'Modifications prise en compte !'
            );

            return $this->redirectToRoute('app_account');
        }

        return $this->renderForm('user/profil-update.html.twig', [
            'form' => $form,
        ]);
    }
}
