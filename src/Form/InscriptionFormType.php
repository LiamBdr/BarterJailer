<?php

namespace App\Form;

use App\Entity\Player;
use App\Security\Captcha\ReCaptchaType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\RepeatedType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\IsTrue;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;

class InscriptionFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('username', TextType::class, [
                'required'   => true,
                'label' => 'Pseudo'
            ])
            ->add('firstname', TextType::class, [
                'required'   => true,
                'label' => 'Prénom'
            ])
            ->add('lastname', TextType::class, [
                'required'   => true,
                'label' => 'Nom'
            ])
            ->add('email', EmailType::class, [
                'required'   => true,
                'label' => 'Email'
            ])
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
            ->add('captcha', ReCaptchaType::class, [
                'type' => 'checkbox', // (invisible, checkbox)
                'mapped' => false
            ])
            ->add('agreeTerms', CheckboxType::class, [
                'mapped' => false,
                'label' => ' ',
                'constraints' => [
                    new IsTrue([
                        'message' => 'Veuillez accepter les conditions d\'utilisation',
                    ]),
                ],
            ])
            ->add('plainPassword', RepeatedType::class, [
                'type' => PasswordType::class,
                'mapped' => false,
                'invalid_message' => 'Les mots de passe doivent être identiques',
                'options' => ['attr' => ['class' => 'password-field']],
                'required' => true,
                'first_options'  => ['label' => 'Mot de passe'],
                'second_options' => ['label' => 'Confirmez le mot de passe'],
                'constraints' => [
                    new NotBlank([
                        'message' => 'Veuillez entrer un mot de passe',
                    ]),
                    new Length([
                        'min' => 6,
                        'minMessage' => 'Votre mot de passe doit contenir au moins {{ limit }} caractères',
                        'max' => 4096,
                    ]),
                ],
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Player::class,
        ]);
    }
}
