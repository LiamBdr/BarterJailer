<?php

namespace App\Entity;

use ApiPlatform\Core\Annotation\ApiResource;
use App\Repository\GameRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: GameRepository::class)]
#[ApiResource(
    collectionOperations: [],
    itemOperations: [
        'get'  => [
            "security" => "object.player1 == user or object.player2 == user",
            "security_message" => "Vous devez être joueur de la partie",
        ],
        'patch' => [
            "security" => "object.player1 == user or object.player2 == user",
            "security_message" => "Vous devez être joueur de la partie",
        ]
    ]
)]
class Game
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private $id;

    #[ORM\Column(type: 'string', length: 255)]
    private $name;

//    #[ORM\ManyToOne(targetEntity: Player::class, inversedBy: 'games')]
    #[ORM\ManyToOne(targetEntity: Player::class)]
    #[ORM\JoinColumn(nullable: false)]
    public $player1;

//    #[ORM\ManyToOne(targetEntity: Player::class, inversedBy: 'games')]
    #[ORM\ManyToOne(targetEntity: Player::class)]
    public $player2;

    #[ORM\Column(type: 'integer')]
    private $playerTurn;

    #[ORM\Column(type: 'json')]
    private $market = [];

    #[ORM\Column(type: 'json', nullable: true)]
    private $stockCards = [];

    #[ORM\Column(type: 'json')]
    private $stockTokens = [];

    #[ORM\Column(type: 'json')]
    private $player1Cards = [];

    #[ORM\Column(type: 'json', nullable: true)]
    private $player1Enclos = [];

    #[ORM\Column(type: 'json', nullable: true)]
    private $player1Tokens = [];

    #[ORM\Column(type: 'integer', nullable: true)]
    private $player1Points;

    #[ORM\Column(type: 'integer', nullable: true)]
    private $player1Victory;

    #[ORM\Column(type: 'json')]
    private $player2Cards = [];

    #[ORM\Column(type: 'json', nullable: true)]
    private $player2Enclos = [];

    #[ORM\Column(type: 'json', nullable: true)]
    private $player2Tokens = [];

    #[ORM\Column(type: 'integer')]
    private $player2Points;

    #[ORM\Column(type: 'integer', nullable: true)]
    private $player2Victory;

    #[ORM\Column(type: 'boolean', nullable: true)]
    private $gameFinish;

    #[ORM\Column(type: 'integer', nullable: true)]
    private $winner_id;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private $date_creation;

    #[ORM\Column(type: 'integer', nullable: true)]
    private $round;

    #[ORM\Column(type: 'json', nullable: true)]
    private $defausse = [];

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getPlayer1(): ?Player
    {
        return $this->player1;
    }

    public function setPlayer1(?Player $player1): self
    {
        $this->player1 = $player1;

        return $this;
    }

    public function getPlayer2(): ?Player
    {
        return $this->player2;
    }

    public function setPlayer2(?Player $player2): self
    {
        $this->player2 = $player2;

        return $this;
    }

    public function getPlayerTurn(): ?int
    {
        return $this->playerTurn;
    }

    public function setPlayerTurn(int $playerTurn): self
    {
        $this->playerTurn = $playerTurn;

        return $this;
    }

    public function getMarket(): ?array
    {
        return $this->market;
    }

    public function setMarket(array $market): self
    {
        $this->market = $market;

        return $this;
    }

    public function getStockCards(): ?array
    {
        return $this->stockCards;
    }

    public function setStockCards(?array $stockCards): self
    {
        $this->stockCards = $stockCards;

        return $this;
    }

    public function getStockTokens(): ?array
    {
        return $this->stockTokens;
    }

    public function setStockTokens(array $stockTokens): self
    {
        $this->stockTokens = $stockTokens;

        return $this;
    }

    public function getPlayer1Cards(): ?array
    {
        return $this->player1Cards;
    }

    public function setPlayer1Cards(array $player1Cards): self
    {
        $this->player1Cards = $player1Cards;

        return $this;
    }

    public function getPlayer1Enclos(): ?array
    {
        return $this->player1Enclos;
    }

    public function setPlayer1Enclos(array $player1Enclos): self
    {
        $this->player1Enclos = $player1Enclos;

        return $this;
    }

    public function getPlayer1Tokens(): ?array
    {
        return $this->player1Tokens;
    }

    public function setPlayer1Tokens(?array $player1Tokens): self
    {
        $this->player1Tokens = $player1Tokens;

        return $this;
    }

    public function getPlayer1Points(): ?int
    {
        return $this->player1Points;
    }

    public function setPlayer1Points(?int $player1Points): self
    {
        $this->player1Points = $player1Points;

        return $this;
    }

    public function getPlayer1Victory(): ?int
    {
        return $this->player1Victory;
    }

    public function setPlayer1Victory(?int $player1Victory): self
    {
        $this->player1Victory = $player1Victory;

        return $this;
    }

    public function getPlayer2Cards(): ?array
    {
        return $this->player2Cards;
    }

    public function setPlayer2Cards(array $player2Cards): self
    {
        $this->player2Cards = $player2Cards;

        return $this;
    }

    public function getPlayer2Enclos(): ?array
    {
        return $this->player2Enclos;
    }

    public function setPlayer2Enclos(array $player2Enclos): self
    {
        $this->player2Enclos = $player2Enclos;

        return $this;
    }

    public function getPlayer2Tokens(): ?array
    {
        return $this->player2Tokens;
    }

    public function setPlayer2Tokens(?array $player2Tokens): self
    {
        $this->player2Tokens = $player2Tokens;

        return $this;
    }

    public function getPlayer2Points(): ?int
    {
        return $this->player2Points;
    }

    public function setPlayer2Points(int $player2Points): self
    {
        $this->player2Points = $player2Points;

        return $this;
    }

    public function getPlayer2Victory(): ?int
    {
        return $this->player2Victory;
    }

    public function setPlayer2Victory(?int $player2Victory): self
    {
        $this->player2Victory = $player2Victory;

        return $this;
    }

    public function getGameFinish(): ?bool
    {
        return $this->gameFinish;
    }

    public function setGameFinish(?bool $gameFinish): self
    {
        $this->gameFinish = $gameFinish;

        return $this;
    }

    public function getWinnerId(): ?int
    {
        return $this->winner_id;
    }

    public function setWinnerId(?int $winner_id): self
    {
        $this->winner_id = $winner_id;

        return $this;
    }

    public function getDateCreation(): ?\DateTimeInterface
    {
        return $this->date_creation;
    }

    public function setDateCreation(?\DateTimeInterface $date_creation): self
    {
        $this->date_creation = $date_creation;

        return $this;
    }

    public function getRound(): ?int
    {
        return $this->round;
    }

    public function setRound(?int $round): self
    {
        $this->round = $round;

        return $this;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;

        return $this;
    }

    public function getDefausse(): ?array
    {
        return $this->defausse;
    }

    public function setDefausse(?array $defausse): self
    {
        $this->defausse = $defausse;

        return $this;
    }
}
