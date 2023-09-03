const axios = require('axios');
const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_KEY });
// console.log(process.env.NOTION_KEY);

const pokeArray = [];

const getPokemon = async () => {
    for (let i = 500; i < 1000; i++) {
        await axios.get(`https://pokeapi.co/api/v2/pokemon/${i}`)
            .then((response) => {
                const sprite = (!response.data.sprites.front_default) ? (response.data.sprites.other['official-artwork'].front_default) : (response.data.sprites.front_default);
                let typeArray = [];
                for (let type of response.data.types) {
                    let obj = {
                        'name': type.type.name
                    };
                    typeArray.push(obj);
                };

                const processedName = response.data.species.name.split(/-/)
                    .map((name) => {
                        return name[0].toUpperCase() + name.substring(1);
                    })
                    .join(" ")
                    .replace(/^Mr M/, "Mr. M")
                    .replace(/^Mime Jr/, "Mime Jr.")
                    .replace(/^Mr R/, "Mr. R")
                    .replace(/mo O/, "mo-o")
                    .replace(/Porygon Z/, "Porygon-Z")
                    .replace(/Type Null/, "Type: Null")
                    .replace(/Ho Oh/, "Ho-Oh")
                    .replace(/Nidoran F/, "Nidoran♀")
                    .replace(/Nidoran M/, "Nidoran♂")
                    .replace(/Flabebe/, "Flabébé")
                    ;

                const bulbURL = `https://bulbapedia.bulbagarden.net/wiki/${processedName.replace(" ", "_")}_(Pokémon)`;

                // console.log(bulbURL);

                const pokeData = {
                    "name": processedName,
                    "number": response.data.id,
                    "types": typeArray,
                    "hp": response.data.stats[0].base_stat,
                    "height": response.data.height,
                    "weight": response.data.weight,
                    "attack": response.data.stats[1].base_stat,
                    "defence": response.data.stats[2].base_stat,
                    "special-attack": response.data.stats[3].base_stat,
                    "special-defence": response.data.stats[4].base_stat,
                    "speed": response.data.stats[5].base_stat,
                    "sprite": sprite,
                    "artwork": response.data.sprites.other['official-artwork'].front_default,
                    "bulbURL": bulbURL
                }
                pokeArray.push(pokeData);
            })
            .catch((error) => {
                console.log('!!!! The Response has not been returned !!!!');
            });
    }
    for (const pokemon of pokeArray) {
        const flavor = await axios.get(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.number}`)
            .then((flavor) => {
                // console.log(flavor);
                const flavorText = flavor.data.flavor_text_entries.find(({ language: { name } }) => name === "en").flavor_text.replace(/\n|\r|\f/g, " ");
                // console.log(flavorText);
                pokemon["flavor-text"] = flavorText;
                const category = flavor.data.genera.find(({ language: { name } }) => name === "en").genus;
                pokemon.category = category;
                const generation = flavor.data.generation.name.split(/-/).pop().toUpperCase();
                // console.log(generation);
                pokemon.generation = generation;
                console.log(`Fetching data of ${pokemon.name} from PokeAPI`);
            })
            ;
    }
    createNotionPage();
}
getPokemon();

const createNotionPage = async () => {
    for (let pokemon of pokeArray) {
        console.log("Sending Data to Notion");
        const response = await notion.pages.create({
            "parent": {
                "type": "database_id",
                "database_id": process.env.NOTION_DATABASE_ID
            },
            "cover": {
                "type": "external",
                "external": {
                    "url": pokemon.artwork
                }
            },
            "icon": {
                "type": "external",
                "external": {
                    "url": pokemon.sprite
                }
            },
            "properties": {
                "Name": {
                    "title": [
                        {
                            "type": "text",
                            "text": {
                                "content": pokemon.name
                            }
                        }
                    ]
                },
                "No": {
                    "number": pokemon.number
                },
                "Type": {
                    "multi_select": pokemon.types
                },
                "Generation": {
                    "select": {
                        "name": pokemon.generation
                    }
                },
                "Category": {
                    "rich_text": [
                        {
                            "type": "text",
                            "text": {
                                "content": pokemon.category
                            }
                        }
                    ]
                },
                "HP": {
                    "number": pokemon.hp
                },
                "Attack": {
                    "number": pokemon.attack
                },
                "Defense": {
                    "number": pokemon.defence
                },
                "Sp. Attack": {
                    "number": pokemon["special-attack"]
                },
                "Sp. Defense": {
                    "number": pokemon["special-defence"]
                },
                "Speed": {
                    "number": pokemon.speed
                },
                "Height": {
                    "number": pokemon.height
                },
                "Weight": {
                    "number": pokemon.weight
                }
            },
            "children": [
                {
                    "object": "block",
                    "type": "quote",
                    "quote": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": pokemon["flavor-text"]
                                }
                            }
                        ]
                    }
                },
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": ""
                                }
                            }
                        ]
                    }
                },
                {
                    "object": "block",
                    "type": "bookmark",
                    "bookmark": {
                        "url": pokemon.bulbURL
                    }
                }
            ]
        });
        // console.log(response);
    }
}