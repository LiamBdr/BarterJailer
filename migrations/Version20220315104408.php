<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20220315104408 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE game ADD player1_enclos JSON DEFAULT NULL, ADD player2_enclos JSON DEFAULT NULL, DROP player1_camels, DROP player2_camels');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE game ADD player1_camels INT DEFAULT NULL, ADD player2_camels INT DEFAULT NULL, DROP player1_enclos, DROP player2_enclos');
    }
}
