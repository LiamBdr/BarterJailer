<?php

namespace App\Entity;

use App\Repository\FriendshipRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: FriendshipRepository::class)]
class Friendship
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private $id;

    #[ORM\ManyToOne(targetEntity: Player::class)]
    #[ORM\JoinColumn(nullable: false)]
    private $user;

    #[ORM\ManyToOne(targetEntity: Player::class)]
    #[ORM\JoinColumn(nullable: false)]
    private $friend;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?Player
    {
        return $this->user;
    }

    public function setUser(?Player $user): self
    {
        $this->user = $user;

        return $this;
    }

    public function getFriend(): ?Player
    {
        return $this->friend;
    }

    public function setFriend(?Player $friend): self
    {
        $this->friend = $friend;

        return $this;
    }
}
