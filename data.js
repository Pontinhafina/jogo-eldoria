const classImages = {
    Guerreiro: { Masculino: 'https://i.imgur.com/ArXSdnS_d.webp?maxwidth=760&fidelity=grand', Feminino: 'https://i.imgur.com/r0uoL1B_d.webp?maxwidth=760&fidelity=grand' },
    Mago: { Masculino: 'https://i.imgur.com/aAKaaUz_d.webp?maxwidth=760&fidelity=grand', Feminino: 'https://i.imgur.com/M2oGdpo_d.webp?maxwidth=760&fidelity=grand' },
    Arqueiro: { Masculino: 'https://i.imgur.com/1WG7eFg_d.webp?maxwidth=760&fidelity=grand', Feminino: 'https://i.imgur.com/IWE0lMl_d.webp?maxwidth=760&fidelity=grand' },
    Ladino: { Masculino: 'https://i.imgur.com/y9mm7Cj_d.webp?maxwidth=760&fidelity=grand', Feminino: 'https://i.imgur.com/hTbqByR_d.webp?maxwidth=760&fidelity=grand' },
    Paladino: { Masculino: 'https://i.imgur.com/MqvFBZR_d.webp?maxwidth=760&fidelity=grand', Feminino: 'https://i.imgur.com/D512ZBz_d.webp?maxwidth=760&fidelity=grand' },
    Bardo: { Masculino: 'https://i.imgur.com/ZBECieC_d.webp?maxwidth=760&fidelity=grand', Feminino: 'https://i.imgur.com/ugCVGKj_d.webp?maxwidth=760&fidelity=grand' },
    Druida: { Masculino: 'https://i.imgur.com/ngg86Ga_d.webp?maxwidth=760&fidelity=grand', Feminino: 'https://i.imgur.com/9Pfekzx_d.webp?maxwidth=760&fidelity=grand' },
    Necromante: { Masculino: 'https://i.imgur.com/UPl1a5R_d.webp?maxwidth=760&fidelity=grand', Feminino: 'https://i.imgur.com/2NWNyb3_d.webp?maxwidth=760&fidelity=grand' },
};

// NOVO: Descrições das Classes
const classDescriptions = {
    'Guerreiro': 'Mestre do combate corpo a corpo. Usa força bruta e resistência para dominar o campo de batalha.',
    'Mago': 'Canalizador de energias arcanas. Manipula os elementos para causar dano devastador ou proteger aliados.',
    'Arqueiro': 'Especialista em ataques à distância. Usa precisão e agilidade para abater inimigos antes que se aproximem.',
    'Ladino': 'Mestre da furtividade e do engano. Ataca das sombras e explora pontos fracos com velocidade mortal.',
    'Paladino': 'Guerreiro sagrado movido por sua fé. Combina poder marcial com magias divinas de proteção e cura.',
    'Bardo': 'Um artista carismático cuja música possui poder mágico. Inspira aliados e desorienta inimigos.',
    'Druida': 'Protetor da natureza. Usa a fúria do mundo natural e pode se transformar em feras selvagens.',
    'Necromante': 'Estudioso das artes sombrias. Comanda os mortos e drena a força vital de seus adversários.'
};
const classAttributes = {
    'Guerreiro': { strength: 16, dexterity: 12, constitution: 15, intelligence: 8, wisdom: 10, charisma: 9 },
    'Mago': { strength: 8, dexterity: 10, constitution: 9, intelligence: 16, wisdom: 14, charisma: 11 },
    'Arqueiro': { strength: 12, dexterity: 16, constitution: 13, intelligence: 10, wisdom: 12, charisma: 10 },
    'Ladino': { strength: 11, dexterity: 16, constitution: 12, intelligence: 13, wisdom: 11, charisma: 12 },
    'Paladino': { strength: 15, dexterity: 10, constitution: 14, intelligence: 9, wisdom: 13, charisma: 14 },
    'Bardo': { strength: 10, dexterity: 14, constitution: 11, intelligence: 12, wisdom: 11, charisma: 16 },
    'Druida': { strength: 11, dexterity: 12, constitution: 13, intelligence: 13, wisdom: 16, charisma: 10 },
    'Necromante': { strength: 9, dexterity: 11, constitution: 12, intelligence: 16, wisdom: 14, charisma: 8 }
};
const classVitality = {
    'Guerreiro': { hp: 120, mp: 30, stamina: 100 },
    'Mago': { hp: 70, mp: 100, stamina: 60 },
    'Arqueiro': { hp: 90, mp: 50, stamina: 90 },
    'Ladino': { hp: 85, mp: 40, stamina: 110 },
    'Paladino': { hp: 110, mp: 60, stamina: 85 },
    'Bardo': { hp: 80, mp: 70, stamina: 90 },
    'Druida': { hp: 95, mp: 80, stamina: 75 },
    'Necromante': { hp: 75, mp: 90, stamina: 65 }
};
const SKILLS_BY_LEVEL = {
    Guerreiro: {
        1: { name: '🛡️ Investida Leve', cost: 5, resource: 'STA', type: 'physical', mainAttribute: 'strength', emoji: '🛡️' }, 2: { name: '🔨 Golpe Poderoso', cost: 10, resource: 'STA', type: 'physical', mainAttribute: 'strength', emoji: '🔨' }, 4: { name: '🧱 Defesa Total', cost: 0, resource: 'STA', type: 'passive', mainAttribute: 'constitution', emoji: '🧱' }, 6: { name: '💥 Investida Destruidora', cost: 20, resource: 'STA', type: 'physical', mainAttribute: 'strength', emoji: '💥' }, 8: { name: '🌀 Grito de Guerra', cost: 15, resource: 'STA', type: 'support', effect: { type: 'buff', target: 'self', stat: 'strength', value: 3, duration: 3 }, emoji: '🌀' }, 10: { name: '🌪️ Ataque Giratório', cost: 25, resource: 'STA', type: 'physical', mainAttribute: 'strength', emoji: '🌪️' } },
    Mago: {
        1: { name: '⚡ Raio de Energia', cost: 10, resource: 'MP', type: 'magic', mainAttribute: 'intelligence', emoji: '⚡' }, 2: { name: '🔥 Bola de Fogo', cost: 15, resource: 'MP', type: 'magic', mainAttribute: 'intelligence', emoji: '🔥' }, 4: { name: '🧊 Escudo Arcano', cost: 10, resource: 'MP', type: 'support', effect: { type: 'buff', target: 'self', stat: 'defense', value: 4, duration: 3}, mainAttribute: 'intelligence', emoji: '🧊' }, 6: { name: '❄️ Raio Congelante', cost: 25, resource: 'MP', type: 'magic', mainAttribute: 'intelligence', emoji: '❄️', effect: { type: 'debuff', target: 'enemy', stat: 'speed', value: -5, duration: 2 } }, 8: { name: '✨ Restauração Menor', cost: 20, resource: 'MP', type: 'support', heal: 25, mainAttribute: 'wisdom', emoji: '✨' }, 10: { name: '☄️ Meteoro Ígneo', cost: 40, resource: 'MP', type: 'magic', mainAttribute: 'intelligence', emoji: '☄️' } },
    Arqueiro: {
        1: { name: '🎯 Tiro Certeiro', cost: 5, resource: 'STA', type: 'physical', mainAttribute: 'dexterity', emoji: '🎯' }, 2: { name: '💨 Tiro Rápido', cost: 10, resource: 'STA', type: 'physical', mainAttribute: 'dexterity', emoji: '💨' }, 4: { name: '☠️ Flecha Venenosa', cost: 15, resource: 'STA', type: 'physical', mainAttribute: 'dexterity', emoji: '☠️', effect: { type: 'debuff', target: 'enemy', stat: 'dot', value: 5, duration: 3 } }, 6: { name: '👻 Tiro Furtivo', cost: 20, resource: 'STA', type: 'physical', mainAttribute: 'dexterity', emoji: '👻' }, 8: { name: '🦅 Olho de Águia', cost: 10, resource: 'STA', type: 'support', effect: { type: 'buff', target: 'self', stat: 'critChance', value: 15, duration: 3 }, emoji: '🦅' }, 10: { name: '🌧️ Chuva de Flechas', cost: 30, resource: 'STA', type: 'physical', mainAttribute: 'dexterity', emoji: '🌧️' } },
    Ladino: {
        1: { name: '🔪 Golpe Surpresa', cost: 5, resource: 'STA', type: 'physical', mainAttribute: 'dexterity', emoji: '🔪' }, 2: { name: '🥷 Ataque Furtivo', cost: 15, resource: 'STA', type: 'physical', mainAttribute: 'dexterity', emoji: '🥷' }, 4: { name: '💨 Evasão', cost: 5, resource: 'STA', type: 'passive', mainAttribute: 'dexterity', emoji: '💨' }, 6: { name: '🩸 Golpe de Misericórdia', cost: 30, resource: 'STA', type: 'physical', mainAttribute: 'dexterity', emoji: '🩸' }, 8: { name: '💣 Bomba de Fumaça', cost: 10, resource: 'STA', type: 'support', effect: { type: 'debuff', target: 'enemy', stat: 'accuracy', value: -10, duration: 2 }, emoji: '💣' }, 10: { name: '⚔️ Dança das Lâminas', cost: 25, resource: 'STA', type: 'physical', mainAttribute: 'dexterity', emoji: '⚔️' } },
    Paladino: {
        1: { name: '✨ Toque Sagrado', cost: 5, resource: 'STA', type: 'physical', mainAttribute: 'strength', emoji: '✨' }, 2: { name: '💖 Cura Leve', cost: 10, resource: 'MP', type: 'support', heal: 20, mainAttribute: 'wisdom', emoji: '💖' }, 4: { name: '🔥 Golpe Sagrado', cost: 15, resource: 'MP', type: 'magic', mainAttribute: 'charisma', emoji: '🔥' }, 6: { name: '😇 Aura de Proteção', cost: 25, resource: 'MP', type: 'support', effect: { type: 'buff', target: 'self', stat: 'defense', value: 5, duration: 3 }, emoji: '😇' }, 8: { name: '☀️ Luz Divina', cost: 20, resource: 'MP', type: 'magic', mainAttribute: 'charisma', emoji: '☀️' }, 10: { name: '🙏 Bênção Maior', cost: 30, resource: 'MP', type: 'support', heal: 40, mainAttribute: 'wisdom', emoji: '🙏' } },
    Bardo: {
        1: { name: '🎶 Acorde Inspirador', cost: 5, resource: 'MP', type: 'support', effect: { type: 'buff', target: 'self', stat: 'staminaRegen', value: 5, duration: 3 }, emoji: '🎶' }, 2: { name: '🥁 Canção de Batalha', cost: 10, resource: 'MP', type: 'support', effect: { type: 'buff', target: 'self', stat: 'damage', value: 3, duration: 3 }, emoji: '🥁' }, 4: { name: '🚪 Fuga Mágica', cost: 10, resource: 'MP', type: 'support', mainAttribute: 'charisma', emoji: '🚪' }, 6: { name: '🔮 Encanto de Persuasão', cost: 20, resource: 'MP', type: 'magic', mainAttribute: 'charisma', emoji: '🔮' }, 8: { name: '😴 Canção de Ninar', cost: 15, resource: 'MP', type: 'magic', effect: { type: 'debuff', target: 'enemy', stat: 'sleep', duration: 1 }, emoji: '😴' }, 10: { name: '🔊 Hino Heróico', cost: 35, resource: 'MP', type: 'support', effect: { type: 'buff', target: 'self', stat: 'allStats', value: 2, duration: 3 }, emoji: '🔊' } },
    Druida: {
        1: { name: '🌿 Crescimento Selvagem', cost: 5, resource: 'STA', type: 'physical', mainAttribute: 'strength', emoji: '🌿' }, 2: { name: '🐻 Forma de Urso', cost: 20, resource: 'STA', type: 'physical', mainAttribute: 'strength', emoji: '🐻' }, 4: { name: '⚕️ Cura da Natureza', cost: 15, resource: 'MP', type: 'support', heal: 25, mainAttribute: 'wisdom', emoji: '⚕️' }, 6: { name: '🌧️ Chuva de Espinhos', cost: 20, resource: 'MP', type: 'magic', mainAttribute: 'wisdom', emoji: '🌧️' }, 8: { name: '🐺 Forma de Lobo', cost: 15, resource: 'STA', type: 'physical', mainAttribute: 'dexterity', emoji: '🐺' }, 10: { name: '🌳 Raízes Prendedoras', cost: 25, resource: 'MP', type: 'magic', effect: { type: 'debuff', target: 'enemy', stat: 'rooted', duration: 2 }, emoji: '🌳' } },
    Necromante: {
        1: { name: '💀 Drenar Sombra', cost: 10, resource: 'MP', type: 'magic', mainAttribute: 'intelligence', emoji: '💀' }, 2: { name: '🖤 Drenar Vida', cost: 15, resource: 'MP', type: 'magic', mainAttribute: 'intelligence', emoji: '🖤' }, 4: { name: '🦴 Invocar Esqueleto', cost: 25, resource: 'MP', type: 'magic', mainAttribute: 'intelligence', emoji: '🦴' }, 6: { name: '🌫️ Névoa da Morte', cost: 35, resource: 'MP', type: 'magic', mainAttribute: 'intelligence', emoji: '🌫️' }, 8: { name: '👻 Toque Fantasma', cost: 20, resource: 'MP', type: 'magic', effect: { type: 'debuff', target: 'enemy', stat: 'fear', duration: 1 }, emoji: '👻' }, 10: { name: '🧟‍♂️ Reanimar Morto', cost: 50, resource: 'MP', type: 'magic', mainAttribute: 'intelligence', emoji: '🧟‍♂️' } }
};

// NOVO: Habilidade Finalizadora Universal
const FINISHER_SKILL = {
    name: '💥 Golpe Finalizador', cost: 100, resource: 'FOCUS', type: 'physical', mainAttribute: 'strength', emoji: '💥', damageMultiplier: 3.0
};

// =============================================
// NOVO: DADOS DE TÍTULOS E REPUTAÇÃO
// =============================================
const TITLES_DATA = {
    "O Misericordioso": {
        description: "Conhecido por sua compaixão, mesmo para com os inimigos.",
        bonus: { type: 'attribute', stat: 'charisma', value: 1 }
    },
    "O Justiceiro": {
        description: "Um vingador implacável contra o mal.",
        bonus: { type: 'attribute', stat: 'strength', value: 1 }
    },
    "O Negociador": {
        description: "Sempre encontra uma maneira de obter o melhor acordo.",
        bonus: { type: 'reputation', stat: 'fame', value: 5 } // Ganha +5% de Fama
    }
    // Adicione mais títulos aqui...
};

// =============================================
// NOVO: BESTIÁRIO DE INIMIGOS
// =============================================
const ENEMIES_DATA = {
    "Goblin Batedor": { 
        level: 1, maxHP: 30, description: "Uma criatura pequena e covarde, perigosa em números.",
        loot: [{ itemName: "Fragmento de Ferro", chance: 0.3 }],
        skills: [
            { name: 'Golpe Fraco', chance: 0.8 }, // 80% de chance de ataque básico
            { name: 'Arremessar Pedra', chance: 0.2, damageMultiplier: 1.2, cost: 0 } // 20% de chance de um ataque mais forte
        ]
    },
    "Lobo Selvagem": { 
        level: 2, maxHP: 45, description: "Um predador rápido e feroz das florestas.",
        loot: [{ itemName: "Erva Comum", chance: 0.5 }],
        skills: [
            { name: 'Mordida', chance: 0.7 },
            { name: 'Uivo Assustador', chance: 0.3, effect: { type: 'debuff', target: 'player', stat: 'fear', value: 1, duration: 2 }, cost: 0 }
        ]
    },
    "Esqueleto Errante": { 
        level: 2, maxHP: 40, description: "Restos mortais reanimados por magia sombria, implacável e sem dor.",
        loot: [{ itemName: "Fragmento de Ferro", chance: 0.4 }],
        skills: [
            { name: 'Golpe de Espada Enferrujada', chance: 1.0 } // Só ataca
        ]
    },
    "Bandido da Estrada": { 
        level: 3, maxHP: 60, description: "Um ladrão oportunista que não hesitará em lutar por algumas moedas.",
        skills: [
            { name: 'Ataque de Adaga', chance: 0.6 },
            { name: 'Ataque de Adaga', chance: 0.6 },
            { name: 'Golpe Baixo', chance: 0.2, damageMultiplier: 1.5, cost: 0 },
            { name: 'Arremessar Areia', chance: 0.2, effect: { type: 'debuff', target: 'player', stat: 'accuracy', value: -20, duration: 2 }, cost: 0 }
        ]
    }
};

// =============================================
// NOVO: DADOS DE EQUIPAMENTOS
// =============================================
const EQUIPMENT_DATA = {
    "Espada Curta": { slot: 'weapon', bonus: { type: 'attribute', stat: 'strength', value: 1 }, description: "+1 Força" },
    "Adaga de Ferro": { slot: 'weapon', bonus: { type: 'attribute', stat: 'dexterity', value: 1 }, description: "+1 Destreza" },
    "Armadura de Couro": { slot: 'armor', bonus: { type: 'attribute', stat: 'constitution', value: 1 }, description: "+1 Constituição" }
};

// =============================================
// NOVO: DADOS DE MISSÕES (BOUNTY BOARD)
// =============================================
const QUESTS_DATA = {
    "bounty_goblin_1": {
        id: "bounty_goblin_1",
        title: "Recompensa: Goblins Batedores",
        description: "Um grupo de Goblins Batedores tem atacado viajantes na estrada ao norte. Elimine 3 deles.",
        type: 'bounty',
        target: "Goblin Batedor",
        targetCount: 3,
        reward: { xp: 50, coins: 25 },
        level: 1
    },
    "bounty_wolf_1": {
        id: "bounty_wolf_1",
        title: "Recompensa: Lobos Selvagens",
        description: "Uma matilha de Lobos Selvagens está ameaçando o gado de uma fazenda próxima. Cace 2 deles.",
        type: 'bounty',
        target: "Lobo Selvagem",
        targetCount: 2,
        reward: { xp: 75, coins: 40 },
        level: 2
    }
    // Adicione mais missões de recompensa aqui
};

// =============================================
// NOVO: DADOS DA LOJA
// =============================================
const SHOP_DATA = {
    inventory: [
        { itemName: "Poção de Cura", price: 20 },
        { itemName: "Elixir de Mana", price: 25 },
        { itemName: "Espada Curta", price: 100 },
        { itemName: "Adaga de Ferro", price: 100 },
        { itemName: "Armadura de Couro", price: 150 }
    ]
};

// =============================================
// NOVO: DADOS DE CRIAÇÃO (CRAFTING)
// =============================================
const CRAFTING_RECIPES = {
    "recipe_potion_1": {
        product: "Poção de Cura",
        ingredients: [{ name: "Erva Comum", count: 2 }],
        description: "Cria uma Poção de Cura a partir de duas Ervas Comuns."
    },
    "recipe_dagger_1": {
        product: "Adaga de Ferro",
        ingredients: [{ name: "Fragmento de Ferro", count: 3 }],
        description: "Forja uma Adaga de Ferro a partir de três Fragmentos de Ferro."
    }
};