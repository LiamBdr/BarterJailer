<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20220309164531 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE game (id INT AUTO_INCREMENT NOT NULL, player1_id INT NOT NULL, player2_id INT DEFAULT NULL, player_turn INT NOT NULL, market JSON NOT NULL, stock_cards JSON DEFAULT NULL, stock_tokens JSON NOT NULL, player1_cards JSON NOT NULL, player1_camels INT DEFAULT NULL, player1_tokens JSON DEFAULT NULL, player1_points INT DEFAULT NULL, player1_victory INT DEFAULT NULL, player2_cards JSON NOT NULL, player2_camels INT DEFAULT NULL, player2_tokens JSON DEFAULT NULL, player2_points INT NOT NULL, player2_victory INT DEFAULT NULL, game_finish TINYINT(1) DEFAULT NULL, winner_id INT DEFAULT NULL, date_creation DATETIME DEFAULT NULL, round INT DEFAULT NULL, INDEX IDX_232B318CC0990423 (player1_id), INDEX IDX_232B318CD22CABCD (player2_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE game ADD CONSTRAINT FK_232B318CC0990423 FOREIGN KEY (player1_id) REFERENCES player (id)');
        $this->addSql('ALTER TABLE game ADD CONSTRAINT FK_232B318CD22CABCD FOREIGN KEY (player2_id) REFERENCES player (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE game');
    }
}
