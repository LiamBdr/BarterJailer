<?php

namespace App\Controller\Admin;

use App\Entity\Player;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\EmailField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class PlayerCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Player::class;
    }

    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id')->onlyOnIndex(),
            EmailField::new('email'),
            TextField::new('username'),
            TextField::new('firstname'),
            TextField::new('lastname'),
            IntegerField::new('state')->setLabel('État'),
            ChoiceField::new('avatar')->setChoices([
                'Jean-Greg' => 'jean-greg',
                'Joy' => 'joy',
                'Jules' => 'jules',
                'Kim' => 'kim',
                'Marcel' => 'marcel',
                'Mathis' => 'mathis'
            ]),
            BooleanField::new('is_verified')->setLabel('Email verifié'),
            DateTimeField::new('date_inscription')->onlyOnForms(),
            DateTimeField::new('last_connection')->onlyOnForms()
        ];
    }
}
