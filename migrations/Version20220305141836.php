<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20220305141836 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE player DROP FOREIGN KEY FK_98197A6586383B10');
        $this->addSql('DROP TABLE avatar');
        $this->addSql('DROP INDEX IDX_98197A6586383B10 ON player');
        $this->addSql('ALTER TABLE player ADD avatar VARCHAR(255) NOT NULL, DROP avatar_id');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE avatar (id INT AUTO_INCREMENT NOT NULL, link VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, name VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('ALTER TABLE player ADD avatar_id INT NOT NULL, DROP avatar');
        $this->addSql('ALTER TABLE player ADD CONSTRAINT FK_98197A6586383B10 FOREIGN KEY (avatar_id) REFERENCES avatar (id)');
        $this->addSql('CREATE INDEX IDX_98197A6586383B10 ON player (avatar_id)');
    }
}
