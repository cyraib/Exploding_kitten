// Original Edition inventory from Assets/decks/exploding-kittens-original-edition/deck.json.
// Shared artwork illustrates a type; it is not a verified per-print copy assignment.
import { project } from './config/runtime.js';
export const BASE_CARDS = {
  "attack-2x": {
    "name": "Attack 2x",
    "family": "attack-2x",
    "count": 4,
    "icon": "/Assets/cards/attack-2x/attack-2x.png",
    "art": "/Assets/cards/attack-2x/artworks/Attack-Bear-o-Dactyl.jpg",
    "color": "#f4a050",
    "description": "End your turn. Give the next player two turns. Attacks stack.",
    "rule": "End your turn without drawing and give the next player two turns. If played while under an Attack, transfer all current/remaining untaken turns and add two. Each required turn is played or passed, then ended by drawing or a valid turn-ending card."
  },
  "beard-cat": {
    "name": "Beard Cat",
    "family": "cat-card",
    "count": 4,
    "icon": "/Assets/cards/cat-card/beard-cat.png",
    "art": "/Assets/cards/cat-card/artworks/Beard-Cat.jpg",
    "color": "#e9c278",
    "description": "Two matching cards steal randomly. Three request a named card.",
    "rule": "A single cat has no effect. Discard two with the same cat name to steal one random card. The optional pair/triple combos extend matching to any shared title; a triple requests a named card and fails if the target lacks it. Feral Cat can replace a powerless cat. Cat identities are not interchangeable without a wildcard."
  },
  "cattermelon": {
    "name": "Cattermelon",
    "family": "cat-card",
    "count": 4,
    "icon": "/Assets/cards/cat-card/cattermelon.png",
    "art": "/Assets/cards/cat-card/artworks/Cattermelon.jpg",
    "color": "#e9c278",
    "description": "Two matching cards steal randomly. Three request a named card.",
    "rule": "A single cat has no effect. Discard two with the same cat name to steal one random card. The optional pair/triple combos extend matching to any shared title; a triple requests a named card and fails if the target lacks it. Feral Cat can replace a powerless cat. Cat identities are not interchangeable without a wildcard."
  },
  "hairy-potato-cat": {
    "name": "Hairy Potato Cat",
    "family": "cat-card",
    "count": 4,
    "icon": "/Assets/cards/cat-card/hairy-potato-cat.png",
    "art": "/Assets/cards/cat-card/artworks/Hairy-Potato-Cat.jpg",
    "color": "#e9c278",
    "description": "Two matching cards steal randomly. Three request a named card.",
    "rule": "A single cat has no effect. Discard two with the same cat name to steal one random card. The optional pair/triple combos extend matching to any shared title; a triple requests a named card and fails if the target lacks it. Feral Cat can replace a powerless cat. Cat identities are not interchangeable without a wildcard."
  },
  "rainbow-ralphing-cat": {
    "name": "Rainbow-Ralphing Cat",
    "family": "cat-card",
    "count": 4,
    "icon": "/Assets/cards/cat-card/rainbow-ralphing-cat.png",
    "art": "/Assets/cards/cat-card/artworks/Rainbow-Ralphing-Cat.jpg",
    "color": "#e9c278",
    "description": "Two matching cards steal randomly. Three request a named card.",
    "rule": "A single cat has no effect. Discard two with the same cat name to steal one random card. The optional pair/triple combos extend matching to any shared title; a triple requests a named card and fails if the target lacks it. Feral Cat can replace a powerless cat. Cat identities are not interchangeable without a wildcard."
  },
  "tacocat": {
    "name": "Tacocat",
    "family": "cat-card",
    "count": 4,
    "icon": "/Assets/cards/cat-card/tacocat.png",
    "art": "/Assets/cards/cat-card/artworks/Tacocat.jpg",
    "color": "#e9c278",
    "description": "Two matching cards steal randomly. Three request a named card.",
    "rule": "A single cat has no effect. Discard two with the same cat name to steal one random card. The optional pair/triple combos extend matching to any shared title; a triple requests a named card and fails if the target lacks it. Feral Cat can replace a powerless cat. Cat identities are not interchangeable without a wildcard."
  },
  "defuse": {
    "name": "Defuse",
    "family": "defuse",
    "count": 6,
    "icon": "/Assets/cards/defuse/defuse.png",
    "art": "/Assets/cards/defuse/artworks/Defuse-Via-3AM-Flatulence.jpg",
    "color": "#92be68",
    "description": "Survive a Kitten, then secretly return it to the draw pile.",
    "rule": "After drawing an Exploding Kitten, discard this to survive and secretly reinsert that Kitten anywhere in the draw pile without inspecting or rearranging other cards. Ends one turn, not every outstanding attacked turn. Cannot be Noped. Special Barking/Devilcat explosions consume a Defuse without reinserting a card."
  },
  "exploding-kitten": {
    "name": "Exploding Kitten",
    "family": "exploding-kitten",
    "count": 4,
    "icon": "/Assets/cards/exploding-kitten/exploding-kitten.png",
    "art": "/Assets/cards/exploding-kitten/artworks/Exploding-Kitten-Alien.jpg",
    "color": "#e85e50",
    "description": "Defuse it immediately, or you are out.",
    "rule": "Reveal immediately. Defuse or die. Under the Original/Party Pack/Cat Burglar rules, discard your whole hand and the lethal Kitten when eliminated. A Streaking Kitten changes whether one Exploding Kitten may be held; see its exceptions. This is not a normal action you can Nope."
  },
  "favor": {
    "name": "Favor",
    "family": "favor",
    "count": 4,
    "icon": "/Assets/cards/favor/favor.png",
    "art": "/Assets/cards/favor/artworks/Favor-Fall-So-Deeply-in-Love.jpg",
    "color": "#88b4e5",
    "description": "Choose a player. They choose one card to give you.",
    "rule": "Choose another player; they choose one card from their hand to give you. In Zombie Kittens, the target must be living. A held Exploding Kitten can be given away under Streaking rules, which makes the recipient resolve its explosion."
  },
  "nope": {
    "name": "Nope",
    "family": "nope",
    "count": 5,
    "icon": "/Assets/cards/nope/nope.png",
    "art": "/Assets/cards/nope/artworks/Nope-A-Jackanope-Bounds-into-the-Room.jpg",
    "color": "#e77b89",
    "description": "Cancel an action before it starts. Nope a Nope to restore it.",
    "rule": "Cancel an action or combo before it begins, even outside your turn. Another Nope cancels a Nope, with successive Nopes alternating cancellation. The action's cards and all Nopes remain discarded. Exploding Kittens and Defuses cannot be Noped. Do not interrupt an action after it has begun."
  },
  "see-the-future-3x": {
    "name": "See the Future 3x",
    "family": "see-the-future-3x",
    "count": 5,
    "icon": "/Assets/cards/see-the-future-3x/see-the-future-3x.png",
    "art": "/Assets/cards/see-the-future-3x/artworks/See-the-Future-Ask-the-All-Seeing-Goat-Wizard.jpg",
    "color": "#c68eb9",
    "description": "Privately peek at the top three cards. Keep their order.",
    "rule": "Privately inspect the top three cards of the draw pile and return them in the same order. Do not reveal them to others. Continue your turn; this does not replace your final draw."
  },
  "shuffle": {
    "name": "Shuffle",
    "family": "shuffle",
    "count": 4,
    "icon": "/Assets/cards/shuffle/shuffle.png",
    "art": "/Assets/cards/shuffle/artworks/Shuffle-A-Kraken-Emerges-and-Hes-Super-Upset.jpg",
    "color": "#aaa0d1",
    "description": "Shuffle the draw pile. Your turn continues.",
    "rule": "Randomize the draw pile without learning its final order. The Original/Party Pack/2-Player/Cat Burglar PDFs say to shuffle thoroughly; NSFW and Good vs. Evil say until the next player tells you to stop. If an Imploding Kitten is face up, shuffle out of sight so its resulting position is unknown."
  },
  "skip": {
    "name": "Skip",
    "family": "skip",
    "count": 4,
    "icon": "/Assets/cards/skip/skip.png",
    "art": "/Assets/cards/skip/artworks/Skip-Commandeer-a-Bunnyraptor.jpg",
    "color": "#70bbc6",
    "description": "End one turn without drawing.",
    "rule": "End one turn without drawing. An Attack with two required turns needs two Skips to avoid both draws."
  }
};
export const CARDS = { ...BASE_CARDS, ...Object.fromEntries((project?.cards || []).map(c => [c.id, c])) };
