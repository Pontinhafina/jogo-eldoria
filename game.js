console.log("Eldoria Script Start"); // Log inicial

// =============================================
// CONFIGURAÇÃO DA API GEMINI (PROXY)
// =============================================
const PROXY_API_URL = 'https://eldoria-api-proxy.davidbrunopatriota205.workers.dev'; // URL CORRETA

let geminiDebounceTimer = null; // NOVO: Timer para debounce
let isApiOnCooldown = false; // NOVO: Flag para cooldown da API

async function generateWithGemini(prompt) {
    try {
        console.log('Enviando prompt para o Proxy:', prompt.substring(0, 100) + '...');
        const response = await fetch(PROXY_API_URL, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Erro no Proxy: ${response.status}`, errorBody);
            throw new Error(`Erro no Proxy: ${response.status}`);
        }
        const data = await response.json();
        if (!data.text) throw new Error('Resposta do Proxy em formato inesperado');
        console.log('Resposta recebida do Proxy');
        return data.text;
    } catch (error) {
        console.error('Erro ao chamar Proxy API:', error);
        return getFallbackResponse(prompt);
    }
}

function getFallbackResponse(prompt) {
     const lowerPrompt = prompt.toLowerCase();
     const commonResponses = ["A ação tem consequências...", "O mundo reage...", "Um novo caminho se abre...", "O silêncio é a única resposta por enquanto."];
     let response = commonResponses[Math.floor(Math.random() * commonResponses.length)];
     
     // NOVO: Garante que o modo narrativo nunca fique sem opções, mesmo em caso de falha.
     if (storyMode === 'narrative' && !isInCombat) {
         const narrativeFallback = "\n\nA. Tentar a mesma ação novamente.\nB. Ignorar e observar os arredores.\nC. Mudar de estratégia e seguir por outro caminho.";
         response = "O fluxo do destino parece turvo por um momento, mas logo se clareia. " + narrativeFallback;
     }
     return response;
}

// =============================================
// SISTEMA DE SOM (Tone.js)
// =============================================
let synth = null;
let toneStarted = false; // Flag para garantir inicialização única
let musicPlayer = null; // NOVO: Player para música de fundo
let currentTrack = null; // NOVO: Para rastrear a música atual
let lastSoundTime = 0; // NOVO: Para evitar colisão de sons

function setupSounds() {
     if (typeof Tone !== 'undefined' && Tone.Synth) {
        try {
             if (Tone.context.state === 'running') {
                 synth = new Tone.Synth().toDestination();
                 console.log("Tone.js Synth iniciado.");
                 // NOVO: Configura o player de música
                 musicPlayer = new Tone.Player({ // URL será definida depois
                     loop: true,
                     autostart: false
                 }).toDestination();
                 toneStarted = true;
             } else {
                 console.warn("Contexto de áudio Tone.js não está rodando. Aguardando interação.");
             }
        } catch(e) {
            console.error("Erro ao criar synth Tone.js:", e);
        }
     } else {
         console.warn("Tone.js não carregado ou Synth não encontrado.");
     }
}

async function startAudioContext() {
    if (typeof Tone !== 'undefined' && Tone.context.state !== 'running') {
        try {
            await Tone.start();
            console.log("Contexto de Áudio Tone.js iniciado pela interação.");
            if (!toneStarted) {
                setupSounds();
            }
        } catch (e) {
             console.error("Erro ao iniciar Tone.js Context:", e);
        }
    } else if (toneStarted) {
        console.log("Contexto de áudio já iniciado.");
    } else {
         console.warn("Tone.js não disponível para iniciar contexto.");
    }
}

function playSoundEffect(type) {
     // CORREÇÃO: Removido isAudioPlaying. O som agora depende apenas do volume e do synth.
     if (!synth || !toneStarted || gameSettings.sfxVolume === 0) return;
     try {
         // CORREÇÃO: Gerenciamento de tempo para evitar colisões
         let scheduledTime = Tone.now();
         if (scheduledTime <= lastSoundTime) {
             scheduledTime = lastSoundTime + 0.05; // Agenda 50ms depois do último som
         }
         lastSoundTime = scheduledTime;

         switch(type) {
             // ATUALIZADO: Sons mais elaborados e com offsets para evitar colisão
             case 'levelUp':
                 synth.triggerAttackRelease("C5", "8n", scheduledTime);
                 synth.triggerAttackRelease("G5", "8n", scheduledTime + 0.2);
                 break;
             case 'attackHit': synth.triggerAttackRelease("E4", "16n", scheduledTime); break;
             case 'takeDamage': synth.triggerAttackRelease("C3", "16n", scheduledTime); break;
             case 'useItem':
                 synth.triggerAttackRelease("G4", "16n", scheduledTime);
                 synth.triggerAttackRelease("C5", "16n", scheduledTime + 0.1);
                 break;
             case 'victory':
                 synth.triggerAttackRelease("C5", "8n", scheduledTime);
                 synth.triggerAttackRelease("E5", "8n", scheduledTime + 0.2);
                 synth.triggerAttackRelease("G5", "4n", scheduledTime + 0.4);
                 break;
             case 'defeat':
                 synth.triggerAttackRelease("G3", "4n", scheduledTime);
                 synth.triggerAttackRelease("D3", "4n", scheduledTime + 0.5);
                 break;
             default: console.warn("Tipo de som desconhecido:", type);
         }
     } catch(e){ console.error("Erro ao tocar som:", e); }
}

async function playMusic(trackUrl) {
    if (!musicPlayer || !trackUrl || !isMusicPlaying || currentTrack === trackUrl) return;
    try {
        if (musicPlayer.state === 'started') musicPlayer.stop();
        currentTrack = trackUrl;
        await musicPlayer.load(trackUrl);
        if (isMusicPlaying) musicPlayer.start();
    } catch (e) {
        console.error(`Erro ao carregar música de ${trackUrl}. Verifique se o arquivo existe e se o servidor local está rodando.`, e);
    }
}

// NOVO: Função para definir a música a ser tocada
function setMusicTrack(trackUrl, forcePlay = false) {
    if (!musicPlayer) return;

    // Se a música estiver desligada, apenas armazena a faixa atual para tocar depois.
    // Se forcePlay for true (usado pelo botão de toggle), tenta tocar.
    if (isMusicPlaying || forcePlay) {
        playMusic(trackUrl);
    }
}

// =============================================
// VARIÁVEIS GLOBAIS E CONSTANTES
// =============================================
let localCharacterProfile = null;
let chatMessages = [];
let currentEnemy = null;
let isInCombat = false;
let selectedClass = null;
let skillPoints = 0;
let preparedEnemy = null; // NOVO: Para o sistema de "Ameaça Iminente"
let relationships = {};
let gameMode = 'singleplayer';
let storyMode = 'sandbox';
let mainQuest = null;
let sideQuests = [];
let currentSceneDescription = "Iniciando a aventura."; // NOVO: O "Banco de Memória" da IA
let attributes = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
const ENEMY_BASE_DAMAGE = 15;
let discoveredEnemies = []; // NOVO: Array para o Bestiário
let coins = 0; // NOVO: Moedas do jogador
let focus = 0; // NOVO: Recurso de Foco para finalizadores
let combatStance = 'balanced'; // NOVO: Postura de combate
let isMusicPlaying = false; // CORREÇÃO: Renomeado para clareza

// NOVO: Sistema de Tempo
let gameTime = {
    day: 1,
    hour: 8, // O jogo começa às 8h da manhã
};

// NOVO: Central de Músicas do Jogo
// INSTRUÇÃO: Coloque suas músicas na pasta 'assets/music' e atualize os nomes dos arquivos aqui.
const MUSIC_TRACKS = {
    menu: 'assets/music/musica menuI.mp3', // Música para o menu principal
    exploration: 'assets/music/Pixel Overworld Quest (Chiptune Loop).mp3', // Música para exploração
    combat: 'assets/music/the-duel.mp3' // Música para batalhas
};


// NOVO: Objeto de configurações do jogo
// ATUALIZADO: Adicionada a flag para o debug panel
let gameSettings = {
    musicVolume: 0.3,
    sfxVolume: 0.5,
    difficulty: 'Normal' // Facil, Normal, Dificil
};

// =============================================
// DEFINIÇÕES COMPLETAS DAS FUNÇÕES DO JOGO
// (Movidas para o escopo global)
// =============================================

// --- Criação de Personagem e UI ---

function saveCharacterProfile() {
    console.log("Attempting to save character...");
    const charNameInput = document.getElementById('char-name-input');
    const charSexInput = document.getElementById('char-sex-input');
    const characterSetupModal = document.getElementById('character-setup');
    
    const name = charNameInput.value.trim();
    const sex = charSexInput.value;
    const role = selectedClass;

    if (!name || !sex || !role) {
        alert('Por favor, preencha o Nome, Sexo e a Classe!');
        console.error('Validation failed: Name, Sex, or Class missing.');
        return;
    }

    const selectedStoryModeCard = document.querySelector('.story-mode-card.selected');
    storyMode = selectedStoryModeCard ? selectedStoryModeCard.getAttribute('data-mode') : 'sandbox';

    applyClassAttributes(role);
    const vitality = getClassVitality(role);
    
    // Aplica modificador de dificuldade
    if (gameSettings.difficulty === 'Facil') {
        vitality.hp = Math.floor(vitality.hp * 1.3);
    } else if (gameSettings.difficulty === 'Dificil') {
        vitality.hp = Math.floor(vitality.hp * 0.8);
    }

    const initialSkillEntry = SKILLS_BY_LEVEL[role]?.[1];
    if (!initialSkillEntry) {
        alert(`Erro interno: Skill inicial não encontrada para ${role}.`);
        console.error(`Error: Initial skill not found for class ${role}.`);
        return;
    }
    const initialSkillName = initialSkillEntry.name;

    document.getElementById('game-wrapper').classList.remove('hidden');
    document.getElementById('game-wrapper').classList.add('flex');

    localCharacterProfile = {
        name: name, age: 30, sex: sex, role: role, level: 1, xp: 0,
        maxHP: vitality.hp, currentHP: vitality.hp, maxMP: vitality.mp, currentMP: vitality.mp,
        maxStamina: vitality.stamina, currentStamina: vitality.stamina,
        inventory: ["Poção de Cura", "Poção de Cura", "Elixir de Mana"], 
        skills: [initialSkillName],
        coins: 50, // NOVO: Moedas iniciais
        equipment: { weapon: null, armor: null, accessory: null }, // NOVO: Slots de equipamento
        titles: [], // NOVO: Array para títulos
        activeTitle: null, // NOVO: Título ativo
        reputation: { fame: 0, infamy: 0 }, // NOVO: Reputação
        attributes: {...attributes}, 
        isDefending: false, 
        statusEffects: [], // Inicializa status effects
        focus: 0 // NOVO: Foco do personagem
    };
    
    skillPoints = 0; // Começa com 0 pontos
    
    characterSetupModal.style.display = 'none';
    document.getElementById('character-name-display').textContent = `${name} (${role})`;
    document.getElementById('sidebar-char-name').textContent = name;
    document.getElementById('sidebar-char-role').textContent = role;
    document.getElementById('sidebar-char-level').textContent = '1';
    document.getElementById('sidebar-char-xp').textContent = '0/100';
    updateCoinsUI(); // NOVO
    
    mainQuest = { title: "Encontre seu Caminho", status: "Ativa", description: "O Oráculo Digital te convocou." };
    sideQuests = [];
    relationships = {}; // Zera relacionamentos, Oráculo não é um NPC

    document.getElementById('sidebar-char-image').src = classImages[role][sex];
    
    updateAttributeDisplay(); 
    updateHealthBars(); 
    updateSkillsList(); 
    updateInventoryUI(); 
    updateQuestsUI(); 
    updateRelationshipsUI();
    updateEquipmentUI(); // NOVO
    updateReputationUI(); // NOVO
    updateChatInputStatus();
    
    document.getElementById('chat-area').innerHTML = '';
    startInitialStory();
    setMusicTrack('assets/music/the-epic-2-by-keys-of-moon.mp3');
    setMusicTrack(MUSIC_TRACKS.exploration);
    console.log("Character saved successfully:", localCharacterProfile);
}

async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const text = userInput.value.trim();
    
    if (!text || !localCharacterProfile || isInCombat || storyMode === 'narrative') return; 
    
    addMessage(text, 'user');
    userInput.value = '';

    // --- NOVO: Sistema de Ações Contextuais ---
    const handled = await handleContextualAction(text);
    if (handled) {
        return; // A ação foi tratada pelo sistema, não precisa enviar para a IA da forma padrão.
    }
    // --- Fim do Sistema de Ações ---

    // NOVO: Lógica de Ameaça Iminente
    if (preparedEnemy) {
        const enemyToFight = { ...preparedEnemy }; // Copia o inimigo preparado
        preparedEnemy = null; // Limpa a ameaça
        if (typeof updateDebugPanel === 'function') updateDebugPanel();
        startCombat(enemyToFight); // Inicia o combate
        // Informa a IA que o combate começou e pede para descrever a ação do jogador
        generateAIResponse(`O combate contra ${enemyToFight.name} começou. O jogador iniciou com a seguinte ação: "${text}". Descreva o resultado deste primeiro movimento.`, localCharacterProfile);
        return; // Interrompe o fluxo normal para focar no combate
    }
    
    generateAIResponse(text, localCharacterProfile);
}

// NOVO: Função para lidar com ações específicas do jogador
async function handleContextualAction(text) {
    const lowerText = text.toLowerCase();

    // Ação: Pagar
    if (lowerText.includes('pagar') || lowerText.includes('pago')) {
        const costMatch = currentSceneDescription.match(/(\d+)\s*moeda/);
        if (costMatch) {
            const cost = parseInt(costMatch[1], 10);
            if (spendCoins(cost)) {
                addMessage(`💰 Você pagou ${cost} moedas.`, 'ai', 'spell');
                await generateAIResponse(`O jogador pagou as ${cost} moedas. Descreva a reação do NPC e o que acontece em seguida.`, localCharacterProfile);
                return true;
            } else {
                addMessage(`❌ Você não tem moedas suficientes!`, 'ai', 'combat');
                await generateAIResponse(`O jogador tentou pagar, mas não tinha moedas suficientes. Descreva a reação do NPC.`, localCharacterProfile);
                return true;
            }
        }
    }

    // Ação: Dormir
    if (lowerText.includes('dormir') || lowerText.includes('descansar')) {
        addMessage('💤 Você decide descansar e recuperar suas forças.', 'ai', 'spell');
        advanceTime(8); // Avança 8 horas
        localCharacterProfile.currentHP = localCharacterProfile.maxHP;
        localCharacterProfile.currentMP = localCharacterProfile.maxMP;
        localCharacterProfile.currentStamina = localCharacterProfile.maxStamina;
        updateHealthBars();
        await generateAIResponse('O jogador dormiu por 8 horas e recuperou totalmente sua vitalidade. Descreva o amanhecer ou a noite e o que ele vê ao acordar.', localCharacterProfile);
        return true;
    }

    return false; // Nenhuma ação contextual foi encontrada
}

function addMessage(text, sender, type = 'normal') {
     const chatArea = document.getElementById('chat-area');
     const choiceButtonsArea = document.getElementById('choice-buttons-area');
     const messageDiv = document.createElement('div');
     let messageClass = `message-box ${sender === 'user' ? 'user-message' : 'ai-message'}`;
     
     if (type === 'combat') messageClass += ' combat-message';
     else if (type === 'level-up') messageClass += ' level-up-message';
     else if (type === 'spell') messageClass += ' spell-message';
     
     messageDiv.className = messageClass;

     let avatarHtml = '';
     if (sender === 'user' && localCharacterProfile) {
         const imgUrl = classImages[localCharacterProfile.role][localCharacterProfile.sex];
         avatarHtml = `<img src="${imgUrl}" class="avatar border-2 border-blue-400" alt="Avatar">`;
     } else if (sender === 'ai') {
         avatarHtml = `<img src="https://placehold.co/40x40/3a2e2a/d4af37?text=OD" class="avatar border-2 border-yellow-400" alt="OD">`;
     }

     let contentText = text;
     
     if (sender === 'ai') {
        choiceButtonsArea.innerHTML = '';
        choiceButtonsArea.classList.add('hidden');
     }

     if (sender === 'ai' && storyMode === 'narrative' && !isInCombat) {
        // Função para extrair e renderizar botões de escolha
        const renderChoices = (messageText) => {
            const choicesMatch = messageText.match(/[A-E]\. [^\n]+/g);
            if (choicesMatch) {
                contentText = messageText.replace(/[A-E]\. [^\n]+/g, '').trim();
                
                choicesMatch.forEach(choice => {
                    const letter = choice.charAt(0);
                    const description = choice.substring(2).trim();
                    const button = document.createElement('button');
                    button.className = 'choice-button';
                    button.innerHTML = `<span class="choice-letter">${letter}</span> ${description}`;
                    button.onclick = () => handleChoice(letter);
                    choiceButtonsArea.appendChild(button);
                });
                choiceButtonsArea.classList.remove('hidden');
                return true; // Indica que as escolhas foram encontradas e renderizadas
            }
            return false;
        };

        // Tenta renderizar as escolhas da mensagem atual. Se não houver, verifica a mensagem anterior da IA.
        if (!renderChoices(text) && chatMessages.length > 0) {
            const lastAiMessage = [...chatMessages].reverse().find(m => m.sender === 'ai');
            if (lastAiMessage) {
                renderChoices(lastAiMessage.text);
            }
        }
     }

     const contentHtml = `<div class="message-content"><div class="font-bold text-sm mb-1">${sender === 'user' ? 'Você' : 'Oráculo Digital'}</div><div class="whitespace-pre-wrap text-sm">${contentText}</div></div>`;
     messageDiv.innerHTML = sender === 'user' ? contentHtml + avatarHtml : avatarHtml + contentHtml;
     
     chatArea.appendChild(messageDiv); 
     chatArea.scrollTop = chatArea.scrollHeight; 
     chatMessages.push({ text, sender, type });
     return messageDiv;
}

function createDialogueBubble(speaker, speech, chatArea) {
    // ATUALIZADO: Cria um balão de diálogo que se parece com uma mensagem de jogador, mas à esquerda.
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-box ai-message';

    // Gera iniciais para o avatar
    const initials = speaker.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const avatarUrl = `https://placehold.co/40x40/4a547c/FFFFFF?text=${initials}`; // Avatar com fundo azulado

    // Usa a classe npc-avatar-border para a borda azul
    const avatarHtml = `<img src="${avatarUrl}" class="avatar border-2 npc-avatar-border" alt="${speaker}">`;
    const contentHtml = `
        <div class="message-content">
            <div class="font-bold text-sm mb-1">${speaker}</div>
            <div class="whitespace-pre-wrap text-sm">${speech}</div>
        </div>`;

    messageDiv.innerHTML = avatarHtml + contentHtml;
    chatArea.appendChild(messageDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function createLetterReplyBubble(senderName, letterContent, chatArea) {
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'letter-reply-bubble';
    bubbleDiv.innerHTML = `
        <div class="speaker-name">📜 Uma carta de ${senderName}:</div>
        <div class="whitespace-pre-wrap text-sm italic mt-2">"${letterContent}"</div>`;
    chatArea.appendChild(bubbleDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function handleChoice(choiceLetter) {
    if (!localCharacterProfile || isInCombat) return;
    document.getElementById('choice-buttons-area').innerHTML = '';
    document.getElementById('choice-buttons-area').classList.add('hidden');
    addMessage(`OPÇÃO ${choiceLetter.toUpperCase()} escolhida.`, 'user');
    generateAIResponse(choiceLetter.toUpperCase(), localCharacterProfile);
}

function getChatHistoryContext() {
    // Pega as últimas 4 mensagens para dar contexto à IA
    // ATUALIZADO: Filtra mensagens de combate e sistema para um histórico mais limpo.
    const history = chatMessages
        .filter(m => m.type === 'normal' || m.type === 'spell' || m.sender === 'user')
        .slice(-4);

    if (history.length === 0) return "Nenhum histórico ainda.";

    return history.map(m => `${m.sender === 'user' ? 'Jogador' : 'Narrador'}: ${m.text}`).join('\n');
}

function debouncedGenerateAIResponse(userMessage, characterContext) {
    clearTimeout(geminiDebounceTimer);
    geminiDebounceTimer = setTimeout(() => {
        generateAIResponse(userMessage, characterContext);
    }, 300); // Espera 300ms antes de enviar
}

async function generateAIResponse(userMessage, characterContext) {
    // NOVO: Checagem de cooldown
    const sendButton = document.getElementById('send-button');
    if (isApiOnCooldown) {
        console.warn("API em cooldown. Ação ignorada.");
        return;
    }
    isApiOnCooldown = true;
    if(sendButton) sendButton.disabled = true; // Desabilita o botão

    isApiOnCooldown = true; // Ativa o cooldown
    setTimeout(() => { isApiOnCooldown = false; }, 2000); // Reseta o cooldown após 2 segundos

    const trackedQuest = sideQuests.find(q => q.tracked);

    let systemInstruction = `
Você é o Oráculo Digital (Mestre de RPG). Crie uma narrativa envolvente baseada na ação do jogador.
CONTEXTO:
- **CENA ATUAL (MEMÓRIA):** ${currentSceneDescription}
- Personagem: ${characterContext.name}, ${characterContext.role}, Nível ${characterContext.level}
- **HORA ATUAL:** Dia ${gameTime.day}, ${gameTime.hour}:00.
- Sexo: ${characterContext.sex}
- Missão Rastreada: ${trackedQuest ? `${trackedQuest.title} - ${trackedQuest.description}` : 'Nenhuma'}
- Modo de História: ${storyMode}
- Mundo: ${getCurrentWorldContext()}
- Atributos: Força ${attributes.strength}, Destreza ${attributes.dexterity}, Inteligência ${attributes.intelligence}, Sabedoria ${attributes.wisdom}, Carisma ${attributes.charisma}
- Mecânica de Combate: Simples, JRPG-like. Força/Destreza aumentam dano físico, Int/Carisma aumentam dano mágico/suporte.

AÇÃO DO JOGADOR: "${userMessage}"

DIRETRIZES:
- Seja descritivo, imersivo e use a língua portuguesa.
- Mantenha coerência com o contexto e o sexo do personagem.
- **Varie as estruturas das frases iniciais e evite repetições.** (ex: não comece sempre com "Você...")
- Limite a resposta a 2-3 parágrafos de narrativa.
- NUNCA mencione que você é uma IA, Oráculo Digital, ou um modelo de linguagem. Use a persona de Narrador/Mestre.

**HISTÓRICO RECENTE DA CONVERSA (para manter a continuidade):**
${getChatHistoryContext()}

**DIRETRIZ CRÍTICA DE IMERSÃO:**
NÃO comece suas respostas com o nome do personagem (ex: "Corvo, ...") ou com descrições do clima (ex: "O vento frio..."). Em vez disso, comece descrevendo a AÇÃO ou o RESULTADO da escolha do jogador. Torne o fluxo da história dinâmico e natural.

**DIRETRIZ DE DIÁLOGO:**
Quando um personagem (NPC) falar, use a tag de diálogo para criar um balão de fala. Formato: \`[DIALOGUE: "Nome do Personagem" | "Texto da fala."]\`
Exemplo: O ferreiro olha para você e diz. [DIALOGUE: "Ferreiro" | "O que você quer? Estou ocupado."]

**DIRETRIZ DE INTERAÇÃO:**
Quando a narrativa apresentar oportunidades claras de interação (ex: comida para comer, uma cama para dormir, um NPC para pagar), **mencione explicitamente o custo em moedas se houver**, para que o jogador saiba que pode realizar a ação.
Exemplo: ...o taverneiro oferece um quarto por 2 moedas.

**DIRETRIZ DE AMEAÇA:**
Quando um inimigo aparecer e a tensão aumentar, mas ANTES do combate começar, use a tag \`[PREPARE_COMBAT: "Nome do Inimigo"]\`. Isso prepara o jogo para a batalha, que começará na próxima ação do jogador. **NÃO narre o início do combate ainda.**
Exemplo: ...uma criatura sombria emerge das árvores. [PREPARE_COMBAT: "Cão Sombrio"]

**NOVA DIRETRIZ DE AÇÃO DE COMBATE NARRATIVO:**
Se o jogador realizar uma ação de ataque e o combate AINDA NÃO tiver começado mecanicamente, você DEVE incluir a tag \`[ATTACK_INTENT]\` em sua resposta descritiva.
Exemplo: O jogador diz "eu ataco o goblin!". Sua resposta descritiva do ataque DEVE conter \`[ATTACK_INTENT]\`.

**DIRETRIZ CRÍTICA DE MEMÓRIA:**
Ao final de CADA resposta narrativa, você DEVE incluir um resumo de uma frase da cena atual para sua própria memória. Use a tag: \`[SCENE_SUMMARY: "resumo da cena"]\`. **Esta tag é obrigatória.**
Exemplo: [SCENE_SUMMARY: "O jogador está em uma taverna barulhenta, conversando com um estranho ferido."]

`;
    let userQuery = `AÇÃO: "${userMessage}"`;
    let isChoiceMode = (storyMode === 'narrative' && !isInCombat);

    systemInstruction += `

**NOVA DIRETRIZ DE ANÁLISE DE AÇÃO:**
Analise a ação do jogador. Se a ação for notável (um ato de grande bondade, crueldade, inteligência ou habilidade), você PODE conceder um título ou alterar a reputação. Use as seguintes tags ESPECIAIS em sua resposta para que o jogo possa processá-las.

- Para conceder um título: \`[TITLE_AWARDED: "Nome do Título"]\` (Ex: \`[TITLE_AWARDED: "O Misericordioso"]\`)
- Para mudar Fama/Infâmia: \`[FAME_CHANGE: valor]\` ou \`[INFAMY_CHANGE: valor]\` (Ex: \`[FAME_CHANGE: 10]\`, \`[INFAMY_CHANGE: 5]\`)
- **NOVO:** Para conceder um ponto de atributo: \`[ATTRIBUTE_GAIN: "nome_do_atributo" | valor]\` (Ex: \`[ATTRIBUTE_GAIN: "intelligence" | 1]\`)

**NOVA DIRETRIZ DE IMERSÃO:**
- Descreva o ambiente com detalhes sensoriais: cheiros, sons, temperatura, etc.
- Descreva os pensamentos e sentimentos internos do personagem em resposta aos eventos.
- Ao introduzir um personagem importante, use a tag \`[NEW_NPC: "Nome do Personagem" | "Descrição breve"]\`.
Exemplo: Você vê uma mulher forte martelando uma espada. [NEW_NPC: "Elara, a Ferreira" | "A ferreira local, conhecida por seu temperamento forte e habilidade."]

**NOVA DIRETRIZ DE MISSÕES:**
Você pode criar uma missão secundária para o jogador. Use a tag \`[NEW_QUEST: "Título da Missão" | "Descrição da missão"]\`. Apenas quando fizer sentido narrativo.
Exemplo: Um fazendeiro diz: "Por favor, ajude-me! [NEW_QUEST: "Problema Lupino" | "Cace 3 Lobos Selvagens que estão atacando meu rebanho."]"

**DIRETRIZ CRÍTICA DE COMBATE:**
Se a ação do jogador levar a um combate direto (ex: "eu ataco", "vamos lutar", "enfrento a criatura"), sua resposta DEVE incluir a tag \`[START_COMBAT: "Nome do Inimigo"]\` e descrever o início da ação. **NÃO diga 'o combate começou' sem usar a tag.** Escolha um inimigo da lista: ${Object.keys(ENEMIES_DATA).join(', ')}.
Exemplo: O jogador diz "vamos lutar". Sua resposta: "Você avança, sacando sua arma! [START_COMBAT: "Aranha Gigante"]"

**DIRETRIZ CRÍTICA PARA MODO NARRATIVO:**
No modo Narrativa, a história precisa progredir. O jogador precisa de desafios para ganhar XP. **VOCÊ DEVE CRIAR SITUAÇÕES DE COMBATE** quando for narrativamente apropriado (explorar uma ruína perigosa, confrontar um bandido, etc.). Use a tag \`[START_COMBAT: "Inimigo"]\` para isso.


Use essas tags com moderação, apenas para ações significativas. Continue a narrativa normalmente após a tag.
`;

    if (isChoiceMode) {
         systemInstruction += `
**DIRETRIZ CRÍTICA PARA MODO NARRATIVO:**
Crie escolhas complexas e significativas. Em vez de "A. Ir para a esquerda", ofereça escolhas sobre *como* agir.
- Inclua opções que testem os atributos do personagem (ex: uma escolha de Carisma para persuadir, uma de Inteligência para investigar).
- Apresente dilemas morais (ajudar um estranho vs. seguir o objetivo principal).
- Ofereça diferentes abordagens para o mesmo problema (força bruta, furtividade, diplomacia).

SUA RESPOSTA DEVE SEMPRE TERMINAR COM 3 A 4 OPÇÕES RICAS E COMPLEXAS. USE ESTE FORMATO:

A. [Primeira Escolha - Ação, Diálogo ou Exploração]
B. [Segunda Escolha - Diálogo, Ação ou Magia]
C. [Terceira Escolha - Exploração, Combate ou Fuga]
D. [Quarta Escolha - Algo mais arriscado ou criativo]
`;
         if (userMessage.match(/^[a-eA-E]$/)) {
            userQuery = `O jogador escolheu a OPÇÃO ${userMessage.toUpperCase()}. Descreva o resultado dessa escolha e apresente as próximas opções A, B, C, D.`;
         } else {
            userQuery = `Crie a próxima cena e apresente as opções A, B, C, D.`;
         }
    } 
    
    const prompt = systemInstruction + "\n\n" + userQuery;
    const chatArea = document.getElementById('chat-area');

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message-box ai-message';
    loadingDiv.innerHTML = `
        <img src="https://placehold.co/40x40/3a2e2a/d4af37?text=OD" class="avatar border-2 border-yellow-400" alt="OD">
        <div class="message-content flex items-center">
            <span>Pensando...</span>
            <div class="loading-indicator ml-2"></div>
        </div>
    `;
    chatArea.appendChild(loadingDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
    
    try {
        const response = await generateWithGemini(prompt);
        chatArea.removeChild(loadingDiv);
        const processedResponse = processAIResponseForGameChanges(response); // Processa a resposta
        addMessage(processedResponse, 'ai');
    } catch (error) {
        console.error("Erro final ao gerar resposta da IA:", error); // Log do erro
        // Verifica se o loadingDiv ainda existe antes de tentar removê-lo
        if (chatArea.contains(loadingDiv)) {
            chatArea.removeChild(loadingDiv);
        }
        const fallback = getFallbackResponse(userMessage); // Gera uma resposta de fallback
        addMessage(fallback, 'ai'); // Adiciona a resposta de fallback ao chat
    }
    if(sendButton && storyMode !== 'narrative' && !isInCombat) {
        sendButton.disabled = false; // Reabilita o botão
    }
    setTimeout(() => { isApiOnCooldown = false; if(sendButton && storyMode !== 'narrative' && !isInCombat) sendButton.disabled = false; }, 2000); // Reseta cooldown e reabilita o botão
    updateChatInputStatus();
}

function processAIResponseForGameChanges(response) {
    let processedText = response;

    // Regex para encontrar [TITLE_AWARDED: "Nome do Título"]
    const titleRegex = /\[TITLE_AWARDED: "([^"]+)"\]/g;
    let titleMatch;
    while ((titleMatch = titleRegex.exec(response)) !== null) {
        const titleName = titleMatch[1];
        addTitle(titleName);
        processedText = processedText.replace(titleMatch[0], "").trim();
    }

    // Regex para Fama e Infâmia
    const fameRegex = /\[FAME_CHANGE: (-?\d+)\]/g;
    const infamyRegex = /\[INFAMY_CHANGE: (-?\d+)\]/g;
    let fameMatch;
    while ((fameMatch = fameRegex.exec(response)) !== null) {
        const value = parseInt(fameMatch[1], 10);
        changeReputation(value, 0);
        processedText = processedText.replace(fameMatch[0], "").trim();
    }
    let infamyMatch;
    while ((infamyMatch = infamyRegex.exec(response)) !== null) {
        const value = parseInt(infamyMatch[1], 10);
        changeReputation(0, value);
        processedText = processedText.replace(infamyMatch[0], "").trim();
    }

    // Regex para combate
    const combatRegex = /\[START_COMBAT: "([^"]+)"\]/g;
    let combatMatch;
    if ((combatMatch = combatRegex.exec(response)) !== null) {
        const enemyName = combatMatch[1];
        if (ENEMIES_DATA[enemyName]) {
            const enemyTemplate = ENEMIES_DATA[enemyName];
            const enemy = { ...enemyTemplate, name: enemyName, currentHP: enemyTemplate.maxHP, statusEffects: [] };
            
            // Atraso para o jogador ler a mensagem antes do combate começar
            setTimeout(() => startCombat(enemy), 1000);
        }
        processedText = processedText.replace(combatMatch[0], "").trim();
    }

    // NOVO: Regex para preparar combate (Ameaça Iminente)
    const prepareCombatRegex = /\[PREPARE_COMBAT: "([^"]+)"\]/g;
    let prepareMatch;
    if ((prepareMatch = prepareCombatRegex.exec(response)) !== null) {
        const enemyName = prepareMatch[1];
        if (ENEMIES_DATA[enemyName]) {
            preparedEnemy = { ...ENEMIES_DATA[enemyName], name: enemyName, currentHP: ENEMIES_DATA[enemyName].maxHP, statusEffects: [] };
            console.log("Ameaça Iminente Preparada:", preparedEnemy.name);
            if (typeof updateDebugPanel === 'function') {
                updateDebugPanel(); // Atualiza o painel de depuração
            }
        }
        processedText = processedText.replace(prepareMatch[0], "").trim();
    }

    // NOVO: Regex para Intenção de Ataque
    const attackIntentRegex = /\[ATTACK_INTENT\]/g;
    if (attackIntentRegex.test(response)) {
        if (preparedEnemy) {
            // Se um inimigo está preparado, a intenção de ataque inicia o combate.
            startCombat(preparedEnemy);
            if (typeof updateDebugPanel === 'function') {
                updateDebugPanel(); // Atualiza o painel de depuração
            }
            preparedEnemy = null; // Limpa a ameaça
        }
        processedText = processedText.replace(attackIntentRegex, "").trim();
    }

    // NOVO: Regex para ganho de atributo
    const attributeGainRegex = /\[ATTRIBUTE_GAIN: "([^"]+)"\s*\|\s*(\d+)\]/g;
    let attrMatch;
    while ((attrMatch = attributeGainRegex.exec(response)) !== null) {
        gainAttribute(attrMatch[1], parseInt(attrMatch[2], 10));
        processedText = processedText.replace(attrMatch[0], "").trim();
    }

    // NOVO: Regex para NPCs
    const npcRegex = /\[NEW_NPC: "([^"]+)"\s*\|\s*"([^"]+)"\]/g;
    let npcMatch;
    while ((npcMatch = npcRegex.exec(response)) !== null) {
        const npcName = npcMatch[1];
        const npcDesc = npcMatch[2];
        addRelationship(npcName, npcDesc);
        processedText = processedText.replace(npcMatch[0], "").trim();
    }

    // NOVO: Regex para Missões
    const questRegex = /\[NEW_QUEST: "([^"]+)"\s*\|\s*"([^"]+)"\]/g;
    let questMatch;
    while ((questMatch = questRegex.exec(response)) !== null) {
        const questTitle = questMatch[1];
        const questDesc = questMatch[2];
        addSideQuest({ title: questTitle, description: questDesc, status: "Ativa" });
        processedText = processedText.replace(questMatch[0], "").trim();
    }

    // NOVO: Regex para o resumo da cena (o "Banco de Memória")
    const summaryRegex = /\[SCENE_SUMMARY: "([^"]+)"\]/g;
    let summaryMatch;
    if ((summaryMatch = summaryRegex.exec(response)) !== null) {
        currentSceneDescription = summaryMatch[1]; // Atualiza a memória da cena
        console.log("Memória da Cena Atualizada:", currentSceneDescription);
        if (typeof updateDebugPanel === 'function') {
            updateDebugPanel(); // Atualiza o painel de depuração
        }
        processedText = processedText.replace(summaryMatch[0], "").trim();
    }

    // Regex para Diálogo (não remove, apenas para garantir que não quebre)
    const dialogueRegex = /\[DIALOGUE: "([^"]+)"\s*\|\s*"([^"]+)"\]/g;
    let dialogueMatch;
    while ((dialogueMatch = dialogueRegex.exec(response)) !== null) {
        // A função addMessage cuidará de extrair e renderizar isso.
        // Não removemos o texto aqui para que addMessage possa processá-lo.
    }

    // Regex para Resposta de Carta (não remove, apenas para garantir que não quebre)
    const letterRegex = /\[LETTER_REPLY: "([^"]+)"\s*\|\s*"([^"]+)"\]/g;
    let letterMatch;
    while ((letterMatch = letterRegex.exec(response)) !== null) {
        // A função addMessage cuidará de extrair e renderizar isso.
        // Não removemos o texto aqui para que addMessage possa processá-lo.
    }

    return processedText;
}

function addTitle(titleName) {
    if (!localCharacterProfile || !TITLES_DATA[titleName]) return;

    if (!localCharacterProfile.titles.includes(titleName)) {
        localCharacterProfile.titles.push(titleName);
        localCharacterProfile.activeTitle = titleName; // Define como ativo por padrão
        addMessage(`👑 Título Adquirido: ${titleName}!`, 'ai', 'level-up');
        updateReputationUI();
    }
}

function changeReputation(fameChange, infamyChange) {
    if (!localCharacterProfile) return;
    localCharacterProfile.reputation.fame = Math.max(0, localCharacterProfile.reputation.fame + fameChange);
    localCharacterProfile.reputation.infamy = Math.max(0, localCharacterProfile.reputation.infamy + infamyChange);
    updateReputationUI();
}

function playerFlee() {
    if (!isInCombat) return;
    addMessage('🏃 Você tenta fugir!', 'user', 'combat');
    const fleeChance = 0.7; // 70% chance
    if (Math.random() < fleeChance) {
        addMessage('✅ **Fuga bem-sucedida!** Você escapa do combate.', 'ai', 'level-up');
        endCombat(false, true); // False para vitória, true para fuga
    } else {
        addMessage('❌ **Fuga falhou!** O inimigo te cerca.', 'ai', 'combat');
        setTimeout(enemyTurn, 1500);
    }
    document.getElementById('skills-section').classList.add('hidden');
}

function showFloatingText(anchorElement, text, color) {
    const floatingText = document.createElement('div');
    floatingText.className = 'floating-text';
    floatingText.textContent = text;
    floatingText.style.color = color;
    const rect = anchorElement.getBoundingClientRect();
    document.body.appendChild(floatingText);
    floatingText.style.left = `${rect.left + rect.width / 2}px`;
    floatingText.style.top = `${rect.top}px`;
    setTimeout(() => { floatingText.remove(); }, 1000);
}

function toggleMusic() {
    startAudioContext(); // Tenta iniciar o áudio na primeira interação
    if (isMusicPlaying) {
         isMusicPlaying = false;
         if (musicPlayer && musicPlayer.state === 'started') musicPlayer.stop();
         document.getElementById('audio-toggle-button').textContent = '🎵 Música';
         console.log("Música desligada.");
    } else {
         isMusicPlaying = true;
         // Toca a música que deveria estar tocando no momento.
         setMusicTrack(currentTrack, true); // O 'true' força a tentativa de tocar.
         document.getElementById('audio-toggle-button').textContent = '🔇 Música';
         console.log("Música ligada.");
    }
}

function updateClassCardImages() {
     const gender = document.getElementById('char-sex-input').value;
     // CORREÇÃO: Usar 'Masculino' como padrão APENAS se o gênero estiver vazio
     const effectiveGender = gender || 'Masculino';
     
     document.querySelectorAll('.class-card').forEach(card => {
         const className = card.getAttribute('data-class');
         const imgElement = card.querySelector('.class-icon-img');
         if (imgElement && classImages[className]) {
             // Tenta pegar a imagem do gênero selecionado
             let imageUrl = classImages[className][effectiveGender]; 
             
             // Se a imagem para o gênero selecionado não existir (ex: Feminino), usa a Masculina como fallback
             if (!imageUrl) {
                 imageUrl = classImages[className]['Masculino'];
             }
             imgElement.src = imageUrl;
         }
     });
}

function applyClassAttributes(className) {
    if (classAttributes[className]) {
        attributes = {...classAttributes[className]};
        updateAttributeDisplay();
    }
}

// ***** FUNÇÃO CORRIGIDA (Adicionada) *****
function updateAttributeDisplay() {
     const attrElementIds = { strength: 'attr-strength', dexterity: 'attr-dexterity', constitution: 'attr-constitution', intelligence: 'attr-intelligence', wisdom: 'attr-wisdom', charisma: 'attr-charisma' };
     const createAttrElementIds = { strength: 'create-strength', dexterity: 'create-dexterity', constitution: 'create-constitution', intelligence: 'create-intelligence', wisdom: 'create-wisdom', charisma: 'create-charisma' };
     
     for (const attr in attributes) {
         const sidebarEl = document.getElementById(attrElementIds[attr]);
         const createEl = document.getElementById(createAttrElementIds[attr]);
         if (sidebarEl) sidebarEl.textContent = attributes[attr];
         if (createEl) createEl.textContent = attributes[attr];
     }
}

function gainAttribute(attrName, value) {
    if (!localCharacterProfile || !attributes[attrName]) return;

    attributes[attrName] += value;
    localCharacterProfile.attributes = { ...attributes }; // Atualiza o perfil do personagem

    addMessage(`✨ Atributo Aumentado: ${attrName.charAt(0).toUpperCase() + attrName.slice(1)} +${value}!`, 'ai', 'level-up');
    updateAttributeDisplay();
}

function getClassVitality(className) { return classVitality[className] || { hp: 100, mp: 50, stamina: 100 }; }

function getActiveSkills() {
     if (!localCharacterProfile || !localCharacterProfile.skills) return [];
     return localCharacterProfile.skills.map(skillName => getSkillByName(skillName)).filter(skill => skill && skill.type !== 'passive');
}

function getSkillByName(skillName) {
    if (!localCharacterProfile) return null;
    const classTree = SKILLS_BY_LEVEL[localCharacterProfile.role];
    if (classTree) {
         for (const level in classTree) {
             if (classTree[level].name === skillName) {
                 return { ...classTree[level] };
             }
         }
    }
    return null;
}

function getCurrentWorldContext() {
    return storyMode === 'sandbox' 
        ? "Mundo aberto de fantasia com reinos diversos, criaturas mágicas e locais antigos para explorar"
        : "Narrativa épica com profecia antiga, facções em conflito e um herói destinado a grandes feitos";
}

function updateChatInputStatus() {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const isNarrativeChoiceMode = (storyMode === 'narrative' && !isInCombat);
    
    if (isNarrativeChoiceMode) {
        userInput.disabled = true;
        sendButton.disabled = true;
        userInput.placeholder = "Selecione uma opção de escolha (A, B, C...)";
        userInput.classList.remove('bg-gray-800');
        userInput.classList.add('bg-gray-700');
    } else if (isInCombat) {
        userInput.disabled = true;
        sendButton.disabled = true;
        userInput.placeholder = "Em Combate! Use os botões de ação.";
        userInput.classList.remove('bg-gray-700');
        userInput.classList.add('bg-gray-800');
    } 
    else { // Sandbox Mode
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.placeholder = `Digite sua ação (Modo: Sandbox Livre)...`;
        userInput.classList.remove('bg-gray-700');
        userInput.classList.add('bg-gray-800');
    }
}

function gainXP(amount) {
     if (!localCharacterProfile) return;
     localCharacterProfile.xp = (localCharacterProfile.xp || 0) + amount;
     const xpNeeded = localCharacterProfile.level * 100;
 
     if (localCharacterProfile.xp >= xpNeeded) { levelUp(); }
     const newXpNeeded = localCharacterProfile.level * 100; // Recalcula caso tenha subido de nível
     document.getElementById('sidebar-char-xp').textContent = `${localCharacterProfile.xp}/${newXpNeeded}`;
     document.getElementById('xp-bar').style.width = `${Math.min(100, (localCharacterProfile.xp / newXpNeeded) * 100)}%`;
}

function levelUp() {
     if (!localCharacterProfile) return;
     localCharacterProfile.level++;
     localCharacterProfile.xp = 0; // Zera XP
     skillPoints += 1; // Ganha ponto de skill

     const baseVitality = getClassVitality(localCharacterProfile.role);
     localCharacterProfile.maxHP = baseVitality.hp + (localCharacterProfile.level * 10);
     localCharacterProfile.currentHP = localCharacterProfile.maxHP;
     localCharacterProfile.maxMP = baseVitality.mp + (localCharacterProfile.level * 5);
     localCharacterProfile.currentMP = localCharacterProfile.maxMP;
     localCharacterProfile.maxStamina = baseVitality.stamina + (localCharacterProfile.level * 8);
     localCharacterProfile.currentStamina = localCharacterProfile.maxStamina;

     // Modificador de dificuldade no HP
    if (gameSettings.difficulty === 'Facil') {
        localCharacterProfile.maxHP = Math.floor(localCharacterProfile.maxHP * 1.3);
    } else if (gameSettings.difficulty === 'Dificil') {
        localCharacterProfile.maxHP = Math.floor(localCharacterProfile.maxHP * 0.8);
    }

     let skillMessage = `Você ganhou 1 Ponto de Habilidade!`;

     const primaryAttrMap = { Guerreiro: 'strength', Mago: 'intelligence', Arqueiro: 'dexterity', Ladino: 'dexterity', Paladino: 'strength', Bardo: 'charisma', Druida: 'wisdom', Necromante: 'intelligence' };
     const primaryAttr = primaryAttrMap[localCharacterProfile.role] || 'strength';
     attributes[primaryAttr]++;
     localCharacterProfile.attributes = {...attributes};

     document.getElementById('sidebar-char-level').textContent = localCharacterProfile.level;
     document.getElementById('sidebar-char-xp').textContent = `0/${localCharacterProfile.level * 100}`;
     document.getElementById('xp-bar').style.width = '0%';
     document.getElementById('skill-points-available').textContent = skillPoints;
     updateHealthBars(); updateAttributeDisplay(); updateSkillsList();

     playSoundEffect('levelUp');
     addMessage(`🎉 **LEVEL UP!** Nível ${localCharacterProfile.level}! ${skillMessage}`, 'ai', 'level-up');
}

function updateHealthBars() {
    if (!localCharacterProfile) return;
    const hpP = (localCharacterProfile.currentHP / localCharacterProfile.maxHP) * 100;
    const mpP = (localCharacterProfile.currentMP / localCharacterProfile.maxMP) * 100;
    const staP = (localCharacterProfile.currentStamina / localCharacterProfile.maxStamina) * 100;
    document.getElementById('hp-bar').style.width = `${Math.max(0, hpP)}%`;
    document.getElementById('mp-bar').style.width = `${Math.max(0, mpP)}%`;
    document.getElementById('stamina-bar').style.width = `${Math.max(0, staP)}%`;
    document.getElementById('hp-value').textContent = `${Math.max(0, Math.floor(localCharacterProfile.currentHP))}/${localCharacterProfile.maxHP}`;
    document.getElementById('mp-value').textContent = `${Math.max(0, Math.floor(localCharacterProfile.currentMP))}/${localCharacterProfile.maxMP}`;
    document.getElementById('stamina-value').textContent = `${Math.max(0, Math.floor(localCharacterProfile.currentStamina))}/${localCharacterProfile.maxStamina}`;
}

function updateInventoryUI() {
    const invList = document.getElementById('inventory-list'); invList.innerHTML = '';
    if (!localCharacterProfile || !localCharacterProfile.inventory || localCharacterProfile.inventory.length === 0) {
         invList.innerHTML = '<li class="text-gray-400 italic">Vazio</li>'; return;
    }
    const counts = localCharacterProfile.inventory.reduce((acc, i) => { acc[i] = (acc[i] || 0) + 1; return acc; }, {});
    Object.entries(counts).forEach(([item, count]) => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center py-1 border-b border-gray-700/50 last:border-b-0';
        let emoji = '📦';
        if (item.includes('Cura')) emoji = '🧪'; else if (item.includes('Mana') || item.includes('Elixir')) emoji = '🍶'; else if (item.includes('Moedas')) emoji = '💰'; else if (item.includes('Equipamento')) emoji = '🛡️';
        li.innerHTML = `<span class="text-white">${emoji} ${item} (x${count})</span>`;
        
        let useBtn;
        if (item.includes('Poção') || item.includes('Elixir')) {
            useBtn = document.createElement('button'); useBtn.textContent = 'Usar';
            useBtn.className = 'text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-md ml-2';
            useBtn.onclick = () => useItem(item, false);
        } else if (EQUIPMENT_DATA[item]) {
            useBtn = document.createElement('button'); useBtn.textContent = 'Equipar';
            useBtn.className = 'text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-md ml-2';
            useBtn.onclick = () => equipItem(item);
        }

        if (useBtn) li.appendChild(useBtn);
        invList.appendChild(li);
    });
}

function useItem(itemName, inCombat = false) {
     if (!localCharacterProfile) return;
     if (inCombat && !isInCombat) return;
     const index = localCharacterProfile.inventory.indexOf(itemName);
     if (index > -1) {
         localCharacterProfile.inventory.splice(index, 1);
         let msg = ''; let heal = 0; let mana = 0;
         const hpAnchor = document.getElementById('hp-value');
         if (itemName.includes('Cura')) {
             heal = 30 + Math.floor(attributes.wisdom / 5);
             localCharacterProfile.currentHP = Math.min(localCharacterProfile.maxHP, localCharacterProfile.currentHP + heal);
             msg = `💖 Usou ${itemName}, recuperando ${heal} de HP.`;
             if(hpAnchor) showFloatingText(hpAnchor, `+${heal}`, '#44ff44');
             playSoundEffect('useItem');
         } else if (itemName.includes('Mana') || itemName.includes('Elixir')) {
             mana = 20 + Math.floor(attributes.intelligence / 5);
             localCharacterProfile.currentMP = Math.min(localCharacterProfile.maxMP, localCharacterProfile.currentMP + mana);
             msg = `✨ Usou ${itemName}, recuperando ${mana} de MP.`;
             if(hpAnchor) showFloatingText(hpAnchor, `+${mana} MP`, '#1e90ff');
             playSoundEffect('useItem');
         } else msg = `Usou ${itemName}.`;
         addMessage(msg, 'ai', 'spell'); updateHealthBars(); updateInventoryUI();
         if (inCombat) { document.getElementById('combat-items-modal').classList.add('hidden'); setTimeout(enemyTurn, 1000); }
     }
}

function updateSkillsList() {
    const list = document.getElementById('skills-list'); list.innerHTML = '';
    if (!localCharacterProfile || !localCharacterProfile.skills || localCharacterProfile.skills.length === 0) {
         list.innerHTML = '<li class="text-gray-400 italic">Nenhuma</li>'; return;
    }
    localCharacterProfile.skills.forEach(skillName => {
         const skill = getSkillByName(skillName); 
         if (skill) {
             const li = document.createElement('li');
             li.textContent = `${skill.emoji} ${skill.name}`; 
             list.appendChild(li);
         }
    });
    updateSkillsModal();
    if(isInCombat) updateCombatSkills();
}

function updateSkillsModal() {
     const content = document.getElementById('skill-tree-content');
     content.innerHTML = '';
     if (!localCharacterProfile) return;

     const classSkills = SKILLS_BY_LEVEL[localCharacterProfile.role];
     for (const level in classSkills) {
        const skill = classSkills[level];
        const node = document.createElement('div');
        node.className = 'skill-node';

        const hasSkill = localCharacterProfile.skills.includes(skill.name);
        const canLearn = skillPoints > 0 && localCharacterProfile.level >= level && !hasSkill;

        if (hasSkill) {
            node.classList.add('active-skill');
        } else if (canLearn) {
            node.classList.add('learnable');
            node.onclick = () => unlockSkill(skill.name, level);
        } else {
            node.classList.add('locked');
        }

        node.innerHTML = `
            <span>${skill.emoji}</span>
            <div>
                <b>${skill.name}</b>
                <div class="text-xs text-gray-400">Custo: ${skill.cost} ${skill.resource} | ${skill.type}</div>
            </div>
            <div class="ml-auto text-right">
                <div class="skill-level-req">Req. Nível ${level}</div>
            </div>
        `;
        content.appendChild(node);
     }
     document.getElementById('skill-points-available').textContent = skillPoints;
}

function unlockSkill(skillName, requiredLevel) {
    if (skillPoints <= 0 || localCharacterProfile.level < requiredLevel || localCharacterProfile.skills.includes(skillName)) return;
    skillPoints--;
    localCharacterProfile.skills.push(skillName);
    addMessage(`💡 Habilidade aprendida: ${skillName}!`, 'ai', 'level-up');
    updateSkillsModal();
    playSoundEffect('levelUp'); // Som de aprender skill
    updateSkillsList();
}

function equipItem(itemName) {
    if (!localCharacterProfile || !EQUIPMENT_DATA[itemName]) return;

    const itemData = EQUIPMENT_DATA[itemName];
    const slot = itemData.slot;

    // Se já houver um item no slot, desequipa primeiro
    if (localCharacterProfile.equipment[slot]) {
        unequipItem(slot);
    }

    // Remove do inventário e equipa
    const index = localCharacterProfile.inventory.indexOf(itemName);
    if (index > -1) {
        localCharacterProfile.inventory.splice(index, 1);
        localCharacterProfile.equipment[slot] = itemName;
        addMessage(`🛡️ Equipou ${itemName}.`, 'ai', 'spell');
        recalculateStats();
        updateInventoryUI();
        updateEquipmentUI();
    }
}

function unequipItem(slot) {
    if (!localCharacterProfile || !localCharacterProfile.equipment[slot]) return;

    const itemName = localCharacterProfile.equipment[slot];
    localCharacterProfile.inventory.push(itemName); // Devolve ao inventário
    localCharacterProfile.equipment[slot] = null;
    addMessage(`✖️ Desequipou ${itemName}.`, 'ai', 'spell');
    recalculateStats();
    updateInventoryUI();
    updateEquipmentUI();
}

function recalculateStats() {
    if (!localCharacterProfile) return;
    // 1. Reseta para os atributos base da classe
    attributes = { ...classAttributes[localCharacterProfile.role] };

    // 2. Aplica bônus de equipamentos
    for (const slot in localCharacterProfile.equipment) {
        const itemName = localCharacterProfile.equipment[slot];
        if (itemName && EQUIPMENT_DATA[itemName]) {
            const itemBonus = EQUIPMENT_DATA[itemName].bonus;
            if (itemBonus.type === 'attribute') {
                attributes[itemBonus.stat] += itemBonus.value;
            }
        }
    }

    // 3. Atualiza a UI
    updateAttributeDisplay();
}

function addCoins(amount) {
    if (!localCharacterProfile) return;
    localCharacterProfile.coins += amount;
    updateCoinsUI();
}

function spendCoins(amount) {
    if (!localCharacterProfile || localCharacterProfile.coins < amount) return false;
    localCharacterProfile.coins -= amount;
    updateCoinsUI();
    return true;
}

function updateCoinsUI() {
    if (!localCharacterProfile) return;
    document.getElementById('sidebar-char-coins').textContent = localCharacterProfile.coins;
}

function updateQuestsUI() {
    const listSidebar = document.getElementById('quests-list-sidebar');
    const modalContent = document.getElementById('quests-modal-content');
    const mainQuestSidebarEl = document.getElementById('main-quest-sidebar');
    const sideQuestsSidebarEl = document.getElementById('side-quests-sidebar');
    if (!listSidebar || !modalContent || !mainQuestSidebarEl || !sideQuestsSidebarEl) { console.error("Elementos UI de Quests não encontrados!"); return; }
    listSidebar.innerHTML = ''; modalContent.innerHTML = '';
    mainQuestSidebarEl.innerHTML = mainQuest ? `<span class="font-bold">M. Principal:</span> ${mainQuest.title} (${mainQuest.status})` : `<span class="font-bold">M. Principal:</span> Nenhuma`;
    sideQuestsSidebarEl.innerHTML = sideQuests.length > 0 ? `<span class="font-bold">M. Secundária:</span> ${sideQuests[0].title} (${sideQuests[0].status})` : `<span class="font-bold">M. Secundária:</span> Nenhuma`;
    listSidebar.appendChild(mainQuestSidebarEl); listSidebar.appendChild(sideQuestsSidebarEl);
    modalContent.innerHTML += `<h3 class="creation-section-title">Missão Principal</h3>`;
    if (mainQuest) {
        modalContent.innerHTML += `<div class="quest-item"><div class="quest-title">${mainQuest.title}<span class="quest-status">(${mainQuest.status})</span></div><div class="quest-desc">${mainQuest.description || 'Sem detalhes.'}</div></div>`;
    } else { modalContent.innerHTML += `<p class="text-gray-400 italic text-sm">Nenhuma missão principal ativa.</p>`; }    
    modalContent.innerHTML += `<h3 class="creation-section-title mt-4">Missões Secundárias</h3>`;
    if (sideQuests.length > 0) {
         sideQuests.forEach(quest => {
             let progress = ''; // CORREÇÃO: A linha abaixo estava com um erro de sintaxe.
             if (quest.type === 'bounty' && quest.progress !== undefined) {
                 progress = `(${quest.progress || 0}/${quest.targetCount})`;
             }
             let trackButtonHtml = '';
             if (quest.status === 'Ativa' && !quest.tracked) {
                 trackButtonHtml = `<button class="track-quest-button" onclick="trackQuest('${quest.id}')">Rastrear Missão</button>`;
             } else if (quest.tracked) {
                 trackButtonHtml = `<span class="text-xs text-yellow-400 font-bold mt-2 block">Rastreando...</span>`;
             }

             modalContent.innerHTML += `
                <div class="quest-item">
                    <div class="quest-title">${quest.title} ${progress}<span class="quest-status">(${quest.status})</span></div>
                    <div class="quest-desc">${quest.description || 'Sem detalhes.'}</div>
                    ${trackButtonHtml}
                </div>`;
         });
    } else { modalContent.innerHTML += `<p class="text-gray-400 italic text-sm">Nenhuma missão secundária ativa.</p>`; }
}

function addSideQuest(questData) {
    // NOVO: Missões começam sem serem rastreadas
    // CORREÇÃO: A linha abaixo estava com erro de sintaxe.
    const newQuest = { ...questData, tracked: false };
    sideQuests.push(newQuest);
    addMessage(`📜 Nova Missão Secundária: ${questData.title}`, 'ai', 'level-up');
}

function addRelationship(npcName, description) {
    if (!relationships[npcName]) {
        relationships[npcName] = { name: npcName, status: 'Neutro', level: 1, description: description };
        updateRelationshipsUI();
        addMessage(`🤝 Você conheceu ${npcName}.`, 'ai', 'spell');
    }
}

function updateRelationshipsUI() {
     const listSidebar = document.getElementById('relationships-list-sidebar');
     const modalContent = document.getElementById('relationships-modal-content');
     if (!listSidebar || !modalContent) { console.error("Elementos UI de Relações não encontrados!"); return; }
     listSidebar.innerHTML = ''; modalContent.innerHTML = '';
     const npcs = Object.values(relationships);
     if (npcs.length === 0) {
         listSidebar.innerHTML = '<p class="text-gray-400 italic text-sm">Ainda não conheceu ninguém.</p>';
         modalContent.innerHTML = '<p class="text-gray-400 italic text-sm">Você ainda não estabeleceu relações importantes.</p>';
     } else {
         npcs.forEach(npc => {
             const li = document.createElement('p'); li.className = 'text-sm mb-1';
             let statusColor = 'text-gray-400';
             if (npc.status === 'Amigável' || npc.status === 'Aliado' || npc.status === 'Romance') statusColor = 'text-green-400';
             else if (npc.status === 'Hostil') statusColor = 'text-red-400';
             li.innerHTML = `<strong>${npc.name}:</strong> <span class="${statusColor}">${npc.status}</span>`;
             listSidebar.appendChild(li);
              const card = document.createElement('div'); card.className = 'relationship-item';
              card.innerHTML = `
                  <div class="relationship-name">${npc.name}<span class="relationship-status">(${npc.status})</span></div>
                  <div class="relationship-desc">${npc.description || 'Detalhes desconhecidos.'}</div>
                  <div class="relationship-level mt-1">
                      <div class="relationship-fill" style="width: ${npc.level * 10}%"></div>
                  </div>
                  <!-- NOVO: Botão de Escrever Carta -->
                  <div class="text-right mt-2">
                      <button class="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded-md" onclick="openLetterModal('${npc.name}')">
                          ✉️ Escrever Carta
                      </button>
                  </div>`;
              modalContent.appendChild(card);
         });
     }
}

function updateEquipmentUI() {
    if (!localCharacterProfile) return;
    document.getElementById('equipped-weapon').textContent = localCharacterProfile.equipment.weapon || "Nenhuma";
    document.getElementById('equipped-armor').textContent = localCharacterProfile.equipment.armor || "Nenhuma";
    document.getElementById('equipped-accessory').textContent = localCharacterProfile.equipment.accessory || "Nenhum";

    // Adiciona evento de clique para desequipar
    document.getElementById('equipped-weapon').onclick = () => unequipItem('weapon');
}

function updateReputationUI() {
    if (!localCharacterProfile) return;

    // Atualiza o título
    const titleElement = document.getElementById('character-title');
    titleElement.textContent = localCharacterProfile.activeTitle || "Nenhum";

    // Atualiza a barra de Fama/Infâmia
    const { fame, infamy } = localCharacterProfile.reputation;
    const totalRep = Math.max(1, fame + infamy); // Evita divisão por zero
    const famePercent = (fame / totalRep) * 100;

    const marker = document.getElementById('reputation-marker');
    // A barra vai de azul (fama) para vermelho (infâmia).
    // 100% fama = 0% na barra. 100% infâmia = 100% na barra.
    const infamyPercent = (infamy / totalRep) * 100;
    marker.style.left = `${infamyPercent}%`;
}


// --- Lógica de Combate ---
function startCombat(enemy, isSimulation = false) {
     if (isInCombat) return;
     preparedEnemy = null; // Limpa qualquer ameaça preparada ao iniciar o combate
     // CORREÇÃO: Garante que as escolhas da narrativa desapareçam ao entrar em combate.
     document.getElementById('choice-buttons-area').innerHTML = '';
     document.getElementById('choice-buttons-area').classList.add('hidden');

     isInCombat = true;
     currentEnemy = {...enemy, statusEffects: enemy.statusEffects || [], isSimulation: isSimulation};
     
     if (typeof updateDebugPanel === 'function') {
        updateDebugPanel(); // Atualiza o painel de depuração
     }
     // Se for simulação, usa uma cópia do personagem
     if (isSimulation) {
         currentEnemy.playerSnapshot = JSON.parse(JSON.stringify(localCharacterProfile));
         localCharacterProfile.focus = 0; // Zera foco para simulação
     } else {
         if (localCharacterProfile && !localCharacterProfile.statusEffects) localCharacterProfile.statusEffects = [];
     }

     document.getElementById('combat-ui').classList.remove('hidden');
     document.getElementById('enemy-name').textContent = currentEnemy.name;
     document.getElementById('enemy-level').textContent = `Nível: ${currentEnemy.level}`;
     updateEnemyHPBar(); updateChatInputStatus(); updateCombatSkills();
     document.getElementById('combat-stances').classList.remove('hidden'); // NOVO: Mostra posturas
     setCombatStance('balanced'); // NOVO: Reseta para postura equilibrada
     displayStatusEffects(true); displayStatusEffects(false);
     // NOVO: Troca para música de batalha
    setMusicTrack('assets/music/the-duel.mp3');
     updateFocusBar(); // NOVO: Atualiza a barra de foco
}

function updateCombatSkills() {
    const grid = document.getElementById('skills-grid'); 
    const section = document.getElementById('skills-section');
    grid.innerHTML = '';
    if (!localCharacterProfile || !localCharacterProfile.skills) { section.classList.add('hidden'); return; }
    
    const active = getActiveSkills();
    if (active.length === 0) { section.classList.add('hidden'); return; }

    active.forEach(s => {
        const btn = document.createElement('button'); btn.className = 'skill-button-combat';
        btn.innerHTML = `${s.emoji} ${s.name} (${s.cost} ${s.resource})`;
        const canUse = (s.resource === 'STA' && localCharacterProfile.currentStamina >= s.cost) || (s.resource === 'MP' && localCharacterProfile.currentMP >= s.cost) || s.cost === 0;
        if (!canUse) { btn.classList.add('disabled'); btn.disabled = true; }
        else btn.onclick = () => playerSkill(s);
        grid.appendChild(btn);
    });
}

function playerSkill(skill) {
     if (!isInCombat || !currentEnemy || !skill || !localCharacterProfile) return;
     if ((skill.resource === 'STA' && localCharacterProfile.currentStamina < skill.cost) || (skill.resource === 'MP' && localCharacterProfile.currentMP < skill.cost)) { addMessage(`Recursos insuficientes!`, 'ai', 'combat'); return; }
     
     if (skill.resource === 'STA') useStamina(skill.cost); 
     else if (skill.resource === 'MP') useMP(skill.cost);
     
     clearExpiredEffects(true); updateStatusEffects(true); displayStatusEffects(true);
     if (localCharacterProfile.currentHP <= 0) { endCombat(false); return; }
     
     let msg = ''; let dmg = 0; let heal = 0;
     const bonus = Math.floor(attributes[skill.mainAttribute] / 3);
     const hpAnchor = document.getElementById('hp-value'); 
     const enemyAnchor = document.getElementById('enemy-hp-anchor');
     let damageModifier = getStatusEffectValue(true, 'damage') - getStatusEffectValue(false, 'defense');
     let healModifier = getStatusEffectValue(true, 'healing');

     // NOVO: Aplica modificador de postura
     let stanceDamageMultiplier = 1.0;
     if (combatStance === 'aggressive') stanceDamageMultiplier = 1.25;
     if (combatStance === 'defensive') stanceDamageMultiplier = 0.75;

     if (skill.type === 'physical' || skill.type === 'magic') {
         const base = skill.type === 'physical' ? 10 : 15;
         dmg = base + bonus + damageModifier + Math.floor(Math.random() * 5);
         dmg = Math.max(1, Math.floor(dmg * stanceDamageMultiplier)); // Aplica postura
         currentEnemy.currentHP -= dmg;
         if(enemyAnchor) takeDamageVisual(dmg, false);
         msg = `${skill.emoji} Usou ${skill.name}, ${dmg} de dano!`;
         playSoundEffect('attackHit');
     } else if (skill.type === 'support') {
         if (skill.heal) {
             heal = (skill.heal || 0) + bonus + healModifier;
             localCharacterProfile.currentHP = Math.min(localCharacterProfile.maxHP, localCharacterProfile.currentHP + heal);
             msg = `💖 Usou ${skill.name}, +${heal} HP!`;
             if(hpAnchor) showFloatingText(hpAnchor, `+${heal}`, '#44ff44');
             playSoundEffect('useItem');
         } else if (skill.effect?.stat === 'staminaRegen') {
             localCharacterProfile.currentStamina = Math.min(localCharacterProfile.maxStamina, localCharacterProfile.currentStamina + 10);
             msg = `🎵 Usou ${skill.name}, +10 STA.`;
             if(hpAnchor) showFloatingText(hpAnchor, `+10 STA`, '#2ecc71');
         } else msg = `✨ Usou ${skill.name}.`;
     }
     
     if (skill.effect) {
        if (skill.effect.target === 'self') applyStatusEffect(true, skill.effect);
        else if (skill.effect.target === 'enemy') applyStatusEffect(false, skill.effect);
     }
     
     msg += ` (-${skill.cost} ${skill.resource})`; 
     addMessage(msg, 'ai', 'spell');
     updateHealthBars(); 
     updateEnemyHPBar(); 
     displayStatusEffects(true); 
     displayStatusEffects(false);
     document.getElementById('skills-section').classList.add('hidden');
     
     if (currentEnemy && currentEnemy.currentHP > 0) setTimeout(enemyTurn, 1500);
}

function takeDamageVisual(amount, isCrit = false) {
    const enemyAnchor = document.getElementById('enemy-hp-anchor');
    const enemyHPBar = document.getElementById('enemy-hp-bar');
    if(enemyAnchor) showFloatingText(enemyAnchor, `-${amount}`, isCrit ? '#ff8c00' : '#ff0000');
    if(enemyHPBar) { enemyHPBar.classList.add('bg-red-900', 'animate-pulse'); setTimeout(() => enemyHPBar.classList.remove('bg-red-900', 'animate-pulse'), 300); }
    // O som é tocado na função de ataque/skill
}

function playerAttack() {
     if (!isInCombat || !currentEnemy || !localCharacterProfile) return;
     clearExpiredEffects(true); updateStatusEffects(true); displayStatusEffects(true);
     if (localCharacterProfile.currentHP <= 0) { endCombat(false); return; }
     
     const initSkillEntry = SKILLS_BY_LEVEL[localCharacterProfile.role]?.[1];
     if (!initSkillEntry) { addMessage('Erro: Ataque básico não encontrado!', 'ai', 'combat'); return; }
     
     const skill = initSkillEntry;
     const cost = 5;
     if (localCharacterProfile.currentStamina < cost) { addMessage('🔋 Stamina baixa!', 'ai', 'combat'); return; }
     
     useStamina(cost);
     const bonus = Math.floor(attributes[skill.mainAttribute] / 3);
     const base = 5;
     let damageModifier = getStatusEffectValue(true, 'damage') - getStatusEffectValue(false, 'defense');
     const dmg = Math.max(1, base + bonus + damageModifier + Math.floor(Math.random() * 3));
     
     // NOVO: Aplica modificador de postura
     let stanceDamageMultiplier = 1.0;
     if (combatStance === 'aggressive') stanceDamageMultiplier = 1.25;
     if (combatStance === 'defensive') stanceDamageMultiplier = 0.75;
     const finalBaseDmg = Math.floor(dmg * stanceDamageMultiplier);

     const isCrit = Math.random() < 0.1; // 10% de chance de crítico
     const finalDmg = isCrit ? Math.floor(dmg * 1.5) : dmg;
     
     currentEnemy.currentHP -= finalDmg; 
     takeDamageVisual(finalDmg, isCrit);

     let attackDesc = `Você ataca com ${skill.name}, causando`;
     if (isCrit) {
        attackDesc = `💥 **ACERTO CRÍTICO!** Seu ataque com ${skill.name} é devastador, causando`;
     }

     addMessage(`⚔️ ${attackDesc} ${finalDmg} de dano! (-${cost} STA)`, 'ai', 'combat');
     updateEnemyHPBar(); 
     displayStatusEffects(false);
     
     if (currentEnemy && currentEnemy.currentHP > 0) setTimeout(enemyTurn, 1500);
     document.getElementById('skills-section').classList.add('hidden');
}

function playerDefend() {
    if (!isInCombat || !localCharacterProfile) return;
    
    // Aumenta a defesa para o próximo turno do inimigo
    applyStatusEffect(true, { type: 'buff', stat: 'defense', value: 10, duration: 1 });
    
    // NOVO: Gera Foco
    localCharacterProfile.focus = Math.min(100, localCharacterProfile.focus + 25);
    updateFocusBar();
     addMessage('🛡️ Postura defensiva! Defesa aumentada e Foco gerado.', 'ai', 'combat');
     setTimeout(enemyTurn, 1500);
     document.getElementById('skills-section').classList.add('hidden');
}

function enemyTurn() {
     if (!isInCombat || !currentEnemy || !localCharacterProfile || localCharacterProfile.currentHP <= 0) return;
     
     clearExpiredEffects(false); updateStatusEffects(false); displayStatusEffects(false);
     if (currentEnemy.currentHP <= 0) { endCombat(true); return; } // Checa se DoT matou inimigo
     
     // NOVO: Lógica de status (medo, sono, etc.)
     if (getStatusEffectValue(false, 'sleep') > 0) {
         addMessage(`💤 ${currentEnemy.name} está dormindo e perde o turno!`, 'ai', 'spell');
         setTimeout(() => {
             clearExpiredEffects(true); updateStatusEffects(true); displayStatusEffects(true);
             if (localCharacterProfile.currentHP <= 0) endCombat(false);
         }, 1500);
         return;
     }
     if (getStatusEffectValue(false, 'fear') > 0 && Math.random() < 0.5) { // 50% de chance de falhar o ataque por medo
         addMessage(`👻 ${currentEnemy.name} está com medo e hesita em atacar!`, 'ai', 'spell');
         setTimeout(() => {
             clearExpiredEffects(true); updateStatusEffects(true); displayStatusEffects(true);
             if (localCharacterProfile.currentHP <= 0) endCombat(false);
         }, 1500);
         return;
     }

     // NOVO: Inimigos usam habilidades
     const enemyData = ENEMIES_DATA[currentEnemy.name];
     if (enemyData && enemyData.skills) {
         const random = Math.random();
         let cumulativeChance = 0;
         for (const skill of enemyData.skills) {
             cumulativeChance += skill.chance;
             if (random < cumulativeChance) {
                 enemyUseSkill(skill);
                 return; // A ação do turno do inimigo termina aqui
             }
         }
     }

     // Ataque básico padrão se nenhuma habilidade for usada
     let rawDmg = (currentEnemy.level * 5) + 10 + Math.floor(Math.random() * 5);
     let damageModifierEnemy = getStatusEffectValue(false, 'damage');
     let reduc = Math.floor(attributes.constitution / 4) + getStatusEffectValue(true, 'defense');

     // Aplica modificador de dificuldade
    if (gameSettings.difficulty === 'Facil') {
        rawDmg = Math.floor(rawDmg * 0.8);
    } else if (gameSettings.difficulty === 'Dificil') {
        rawDmg = Math.floor(rawDmg * 1.3);
    }

     // NOVO: Aplica modificador de postura do jogador
     let stanceDamageTakenMultiplier = 1.0;
     if (combatStance === 'aggressive') stanceDamageTakenMultiplier = 1.25;
     if (combatStance === 'defensive') stanceDamageTakenMultiplier = 0.60; // 40% de redução

     const finalDmg = Math.max(1, Math.floor((rawDmg + damageModifierEnemy - reduc) * stanceDamageTakenMultiplier));

     const isCrit = Math.random() < 0.05; // 5% de chance de crítico para inimigos
     const finalDamageWithCrit = isCrit ? Math.floor(finalDmg * 1.5) : finalDmg;
     
     takeDamage(finalDamageWithCrit);
     const hpAnchor = document.getElementById('hp-value');
     if(hpAnchor) showFloatingText(hpAnchor, `-${finalDamageWithCrit}`, '#ff4444');
     playSoundEffect('takeDamage');

     let attackDesc = `👹 ${currentEnemy.name} ataca, causando`;
     if (isCrit) {
        attackDesc = `💥 **CRÍTICO!** O ataque de ${currentEnemy.name} acerta um ponto vital, causando`;
     }
     addMessage(`${attackDesc} ${finalDamageWithCrit} de dano!`, 'ai', 'combat');
     
     playSoundEffect('takeDamage');
     displayStatusEffects(true); // Atualiza status do jogador
     
     if (localCharacterProfile.currentHP <= 0) {
         endCombat(false);
     } else {
        clearExpiredEffects(true); updateStatusEffects(true); displayStatusEffects(true);
        if (localCharacterProfile.currentHP <= 0) endCombat(false); // Checa se DoT matou jogador
     }
}

function enemyUseSkill(skill) {
    if (!isInCombat || !currentEnemy || !localCharacterProfile) return;

    if (skill.effect) {
        // Habilidade de suporte/debuff
        addMessage(`👹 ${currentEnemy.name} usa ${skill.name}!`, 'ai', 'combat');
        if (skill.effect.target === 'player') {
            applyStatusEffect(true, skill.effect);
        } else {
            applyStatusEffect(false, skill.effect); // Buff para si mesmo
        }
    } else {
        // Habilidade de ataque
        let rawDmg = (currentEnemy.level * 5) + 10;
        rawDmg *= (skill.damageMultiplier || 1.0); // Aplica multiplicador de dano da skill
        let damageModifierEnemy = getStatusEffectValue(false, 'damage');
        let reduc = Math.floor(attributes.constitution / 4) + getStatusEffectValue(true, 'defense');
        const finalDmg = Math.max(1, Math.floor(rawDmg + damageModifierEnemy - reduc));
        const isCrit = Math.random() < 0.05;
        const finalDamageWithCrit = isCrit ? Math.floor(finalDmg * 1.5) : finalDmg;
        
        takeDamage(finalDamageWithCrit);
        const hpAnchor = document.getElementById('hp-value');
        if(hpAnchor) showFloatingText(hpAnchor, `-${finalDamageWithCrit}`, '#ff4444');
        playSoundEffect('takeDamage');

        let attackDesc = isCrit ? `💥 **CRÍTICO!** ${currentEnemy.name} usa ${skill.name} com força brutal, causando` : `👹 ${currentEnemy.name} usa ${skill.name}, causando`;
        addMessage(`${attackDesc} ${finalDamageWithCrit} de dano!`, 'ai', 'combat');
        playSoundEffect('takeDamage');
    }
    
    setTimeout(() => { if (localCharacterProfile.currentHP > 0) { clearExpiredEffects(true); updateStatusEffects(true); displayStatusEffects(true); } else { endCombat(false); } }, 1500);
}

function takeDamage(amount) { if (!localCharacterProfile) return; localCharacterProfile.currentHP = Math.max(0, localCharacterProfile.currentHP - amount); updateHealthBars(); }
function useStamina(amount) { if (!localCharacterProfile) return; localCharacterProfile.currentStamina = Math.max(0, localCharacterProfile.currentStamina - amount); updateHealthBars(); }
function useMP(amount) { if (!localCharacterProfile) return; localCharacterProfile.currentMP = Math.max(0, localCharacterProfile.currentMP - amount); updateHealthBars(); }

function updateEnemyHPBar() {
    if (!currentEnemy) return;
    const hpP = (currentEnemy.currentHP / currentEnemy.maxHP) * 100;
    const barElement = document.getElementById('enemy-hp-bar');
    if (barElement) barElement.style.width = `${Math.max(0, hpP)}%`;
    if (currentEnemy.currentHP <= 0 && isInCombat) endCombat(true);
}

function endCombat(victory, flee = false) {
    if (!isInCombat) return;

    // CORREÇÃO: Guarda as informações do inimigo ANTES de limpá-lo.
    const isSimulation = currentEnemy?.isSimulation || false;
    const enemyName = currentEnemy ? currentEnemy.name : "inimigo";
    const enemyLevel = currentEnemy ? currentEnemy.level : 1;
    const playerSnapshot = isSimulation ? { ...currentEnemy.playerSnapshot } : null;

     isInCombat = false;
     document.getElementById('combat-ui').classList.add('hidden');
     document.getElementById('skills-section').classList.add('hidden');
     document.getElementById('combat-stances').classList.add('hidden'); // NOVO: Esconde posturas
     document.getElementById('player-status-effects').innerHTML = '';
     document.getElementById('enemy-status-effects').innerHTML = '';
     currentEnemy = null;
     if (localCharacterProfile) localCharacterProfile.focus = 0;
     if (typeof updateDebugPanel === 'function') {
        updateDebugPanel(); // Atualiza o painel de depuração
     }

     // NOVO: Adiciona inimigo ao bestiário se for a primeira vez
     // Garante que não adicione o 'Simulador' ao bestiário
     if (victory && !isSimulation && !discoveredEnemies.includes(enemyName)) {
        discoveredEnemies.push(enemyName);
        addMessage(`👹 Nova entrada no Bestiário: ${enemyName}`, 'ai', 'spell');
     }

     // NOVO: Lógica de progresso de missão de caça
     if (victory && localCharacterProfile) {
        sideQuests.forEach(quest => {
            if (quest.status === 'Ativa' && quest.type === 'bounty' && quest.target === enemyName) {
                quest.progress = (quest.progress || 0) + 1;
                addMessage(`📜 Progresso da missão "${quest.title}": ${quest.progress}/${quest.targetCount}`, 'ai', 'spell');
                if (quest.progress >= quest.targetCount) {
                    quest.status = 'Completa';
                    addMessage(`✅ Missão Completa: ${quest.title}!`, 'ai', 'level-up');
                    gainXP(quest.reward.xp);
                    addCoins(quest.reward.coins);
                    addMessage(`💰 Recompensa: +${quest.reward.xp} XP, +${quest.reward.coins} Moedas!`, 'ai', 'level-up');
                }
            }
        });
        updateQuestsUI();
     }
     
     if (isSimulation) {
        addMessage(`⚙️ Simulação de combate contra ${enemyName} terminada.`, 'ai', 'spell');
        // Restaura a vida do personagem real que foi copiada no snapshot
        if (playerSnapshot) localCharacterProfile.currentHP = playerSnapshot.currentHP;
     } else {
        if (flee) { /* Não faz nada especial ao fugir por enquanto */ }
        else if (victory) {
            const xpGained = 15 + (enemyLevel * 5) + Math.floor(Math.random() * 10); gainXP(xpGained);
            addMessage(`🎉 **VITÓRIA!** Derrotou ${enemyName}! (+${xpGained} XP)`, 'ai', 'level-up');
            playSoundEffect('victory');

            // NOVO: Sistema de Loot aprimorado
            const enemyLootTable = ENEMIES_DATA[enemyName]?.loot || [];
            enemyLootTable.forEach(lootItem => {
                if (Math.random() < lootItem.chance) {
                    localCharacterProfile.inventory.push(lootItem.itemName);
                    addMessage(`💰 Loot: Encontrou ${lootItem.itemName}!`, 'ai', 'spell');
                }
            });
            updateInventoryUI();

        } else {
            addMessage(`💀 **DERROTA!** Derrotado por ${enemyName}.`, 'ai', 'combat');
            if(localCharacterProfile) { localCharacterProfile.currentHP = Math.max(1, Math.floor(localCharacterProfile.maxHP * 0.1)); localCharacterProfile.currentMP = Math.floor(localCharacterProfile.maxMP * 0.5); localCharacterProfile.currentStamina = Math.floor(localCharacterProfile.maxStamina * 0.5); updateHealthBars(); }
        }
        if(localCharacterProfile) localCharacterProfile.statusEffects = [];
        
        // **NOVO**: Continua a narrativa se estiver no modo história
        continueNarrativeAfterCombat(victory, enemyName);
     }

     // NOVO: Retorna para a música de exploração
    setMusicTrack(MUSIC_TRACKS.exploration);

     // NOVO: Oportunidade de Saquear
     if (victory && !isSimulation) {
        currentSceneDescription += ` O corpo de ${enemyName} está no chão.`;
     }
     updateHealthBars(); // Garante que a vida seja atualizada após simulação
     updateChatInputStatus();
}

function continueNarrativeAfterCombat(victory, enemyName) {
    // Se não estiver no modo narrativo, o jogador controla o fluxo, então não fazemos nada.
    if (storyMode !== 'narrative' || !localCharacterProfile) return;

    // Cria um prompt para a IA continuar a história após o combate
    const postCombatPrompt = `A batalha contra ${enemyName} terminou. O jogador foi ${victory ? 'vitorioso' : 'derrotado'}. Continue a história a partir daqui e apresente as próximas opções A, B, C, D.`;
    generateAIResponse(postCombatPrompt, localCharacterProfile);
}

function openCombatItemsModal() {
     if (!localCharacterProfile || !isInCombat) return;
     const list = document.getElementById('combat-items-list'); list.innerHTML = '';
     const consumables = localCharacterProfile.inventory.filter(i => i.includes('Poção') || i.includes('Elixir'));
     if (consumables.length === 0) list.innerHTML = '<p class="text-gray-400 italic text-sm">Nenhum item.</p>';
     else {
         const counts = consumables.reduce((acc, i) => { acc[i] = (acc[i] || 0) + 1; return acc; }, {});
         Object.entries(counts).forEach(([item, count]) => {
             const el = document.createElement('div'); el.className = 'item-list-item';
             let emoji = item.includes('Cura') ? '🧪' : '🍶';
             el.innerHTML = `<span>${emoji} ${item} (x${count})</span>`;
             const btn = document.createElement('button'); btn.textContent = 'Usar'; btn.onclick = () => useItem(item, true); el.appendChild(btn); list.appendChild(el);
         });
     }
     document.getElementById('combat-items-modal').classList.remove('hidden');
}

// --- NOVO: Funções da Loja e Mural de Recompensas ---
function openShopModal() {
    const modal = document.getElementById('shop-modal');
    const content = document.getElementById('shop-items-list');
    content.innerHTML = '';

    SHOP_DATA.inventory.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'shop-item';
        itemEl.innerHTML = `
            <span>${item.itemName} - ${EQUIPMENT_DATA[item.itemName]?.description || 'Item de Consumo'}</span>
            <div class="flex items-center">
                <span class="mr-4 text-yellow-400">${item.price} Moedas</span>
                <button class="shop-button buy">Comprar</button>
            </div>
        `;
        itemEl.querySelector('.buy').onclick = () => buyItem(item.itemName, item.price);
        content.appendChild(itemEl);
    });
    modal.classList.remove('hidden');
}

function buyItem(itemName, price) {
    if (!localCharacterProfile) return;
    if (spendCoins(price)) {
        localCharacterProfile.inventory.push(itemName);
        addMessage(`🛒 Comprou ${itemName} por ${price} moedas.`, 'ai', 'spell');
        updateInventoryUI();
    } else {
        addMessage(`❌ Moedas insuficientes para comprar ${itemName}.`, 'ai', 'combat');
    }
}

function openBountyBoardModal() {
    const modal = document.getElementById('bounty-board-modal');
    const content = document.getElementById('bounty-list');
    content.innerHTML = '';

    Object.values(QUESTS_DATA).forEach(quest => {
        const isAlreadyActive = sideQuests.some(sq => sq.id === quest.id && sq.status === 'Ativa');
        const isCompleted = sideQuests.some(sq => sq.id === quest.id && sq.status === 'Completa');

        const questEl = document.createElement('div');
        questEl.className = 'bounty-item';
        questEl.innerHTML = `
            <div class="bounty-title">${quest.title} (Nível Rec. ${quest.level})</div>
            <div class="bounty-desc">${quest.description}</div>
            <div class="bounty-reward">Recompensa: ${quest.reward.xp} XP, ${quest.reward.coins} Moedas</div>
        `;

        const button = document.createElement('button');
        button.className = 'bounty-button';
        
        if (isCompleted) {
            button.textContent = 'Concluída';
            button.disabled = true;
        } else if (isAlreadyActive) {
            button.textContent = 'Em Andamento';
            button.disabled = true;
        } else {
            button.textContent = 'Aceitar';
            button.onclick = () => acceptBounty(quest.id);
        }
        
        questEl.appendChild(button);
        content.appendChild(questEl);
    });

    modal.classList.remove('hidden');
}

function acceptBounty(questId) {
    if (!localCharacterProfile || !QUESTS_DATA[questId]) return;
    const questData = QUESTS_DATA[questId];
    
    // CORREÇÃO: A linha abaixo estava com erro de sintaxe.
    addSideQuest({ ...questData, status: 'Ativa', progress: 0 });
    document.getElementById('bounty-board-modal').classList.add('hidden');
    updateQuestsUI();
}

// NOVO: Função para rastrear uma missão
function trackQuest(questId) {
    if (!localCharacterProfile) return;

    // Desmarca todas as outras missões
    sideQuests.forEach(q => q.tracked = false);

    // Encontra e marca a missão selecionada
    const questToTrack = sideQuests.find(q => q.id === questId);
    if (questToTrack) {
        questToTrack.tracked = true;
        addMessage(`🎯 Missão rastreada: "${questToTrack.title}". Use o botão 'Viajar' para iniciar a jornada.`, 'ai', 'spell');
    }
    // Fecha o modal de missões
    document.getElementById('quests-modal').classList.add('hidden');

    // Atualiza a UI para refletir a mudança
    updateQuestsUI();
}

// --- NOVO: Funções de Viagem ---
function openTravelModal() {
    const modal = document.getElementById('travel-modal');
    const content = document.getElementById('travel-destinations-list');
    content.innerHTML = '';

    const trackedQuest = sideQuests.find(q => q.tracked);

    if (trackedQuest) {
        const destEl = document.createElement('div');
        destEl.className = 'bounty-item'; // Reutilizando estilo
        destEl.innerHTML = `
            <div class="bounty-title">${trackedQuest.title}</div>
            <div class="bounty-desc">${trackedQuest.description}</div>
            <button class="track-quest-button mt-2">Iniciar Viagem</button>
        `;
        destEl.querySelector('button').onclick = () => travelToQuest(trackedQuest.id);
        content.appendChild(destEl);
    } else {
        content.innerHTML = '<p class="text-gray-400 italic text-sm">Nenhuma missão rastreada. Vá para o menu de Missões para rastrear uma.</p>';
    }

    modal.classList.remove('hidden');
}

function travelToQuest(questId) {
    const quest = sideQuests.find(q => q.id === questId);
    if (!quest) return;

    document.getElementById('travel-modal').classList.add('hidden');

    const prompt = `O jogador decidiu iniciar a jornada para a missão rastreada: "${quest.title}". Descreva o início da viagem e os primeiros passos para completar o objetivo: ${quest.description}.`;
    generateAIResponse(prompt, localCharacterProfile);
}


// --- NOVO: Função de Postura de Combate ---
function setCombatStance(newStance) {
    combatStance = newStance;
    document.querySelectorAll('.stance-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-stance') === newStance) {
            btn.classList.add('active');
        }
    });
}

// --- NOVO: Funções de Cartas ---
function openLetterModal(npcName) {
    const modal = document.getElementById('letter-modal');
    modal.classList.remove('hidden');
    document.getElementById('letter-recipient').textContent = `Escrever para ${npcName}`;
    document.getElementById('send-letter-btn').dataset.recipient = npcName;
}

function closeLetterModal() {
    const modal = document.getElementById('letter-modal');
    modal.classList.add('hidden');
    document.getElementById('letter-textarea').value = '';
}

async function sendLetter() {
    const recipient = document.getElementById('send-letter-btn').dataset.recipient;
    const content = document.getElementById('letter-textarea').value.trim();

    if (!recipient || !content) {
        alert("Por favor, escreva uma mensagem.");
        return;
    }

    closeLetterModal();
    addMessage(`Você envia uma carta para ${recipient}.`, 'user');

    const prompt = `
    O jogador ${localCharacterProfile.name} enviou a seguinte carta para ${recipient}: "${content}".
    Considerando a personalidade de ${recipient} e a relação atual (${relationships[recipient].status}), escreva uma resposta curta na forma de uma carta de volta.
    A resposta deve usar a tag [LETTER_REPLY: "Nome do Remetente" | "Conteúdo da carta"]. A resposta também pode mudar a relação (Amigável, Hostil, Romance).`;
    debouncedGenerateAIResponse(prompt, localCharacterProfile);
}

// --- Sistema de Save/Load ---
function saveGame() {
    if (!localCharacterProfile) return;
    const data = { 
        character: {...localCharacterProfile}, 
        chat: chatMessages, 
        story: storyMode, 
        skillsPts: skillPoints, 
        quests: { main: mainQuest, side: sideQuests }, 
        settings: gameSettings, // Salva as configurações
        attributes: attributes, 
        relationships: relationships, 
        sceneDescription: currentSceneDescription, // NOVO: Salva a memória da cena
        discoveredEnemies: discoveredEnemies // NOVO: Salva bestiário
    };
    localStorage.setItem('eldoriaSave', JSON.stringify(data)); 
    // addMessage('💾 Jogo salvo!', 'ai'); // Opcional: pode remover do chat
    const saveBtn = document.getElementById('save-game-button');
    saveBtn.textContent = '✅ Salvo!';
    saveBtn.classList.add('bg-blue-500'); // Cor de sucesso
    setTimeout(() => {
        saveBtn.textContent = '💾 Salvar';
        saveBtn.classList.remove('bg-blue-500');
    }, 2000); // Volta ao normal após 2 segundos
}

function loadGame() {
    const saved = localStorage.getItem('eldoriaSave'); if (!saved) return false;
    try {
        const data = JSON.parse(saved); 
        localCharacterProfile = data.character;
        if (!localCharacterProfile.statusEffects) localCharacterProfile.statusEffects = [];
        chatMessages = data.chat || []; 
        storyMode = data.story || 'sandbox';
        attributes = data.attributes || localCharacterProfile.attributes; 
        skillPoints = data.skillsPts || 0; 
        gameSettings = data.settings || gameSettings; // Carrega as configurações
        // coins = data.coins || 0; // Moedas são parte do character profile
        mainQuest = data.quests?.main || null; 
        sideQuests = data.quests?.side || []; 
        relationships = data.relationships || {};
        currentSceneDescription = data.sceneDescription || "Continuando a aventura."; // NOVO: Carrega a memória da cena
        discoveredEnemies = data.discoveredEnemies || []; // NOVO: Carrega bestiário
        gameTime = data.gameTime || { day: 1, hour: 8 }; // NOVO: Carrega o tempo
        
        updateUIFromSave(); 
        document.getElementById('chat-area').innerHTML = ''; 
        chatMessages.forEach(m => addMessage(m.text, m.sender, m.type)); 
        addMessage('🔄 Jogo carregado!', 'ai'); 
        return true;
    } catch (e) { console.error('Load error:', e); alert('Erro ao carregar.'); localStorage.removeItem('eldoriaSave'); return false; }
}

function updateUIFromSave() {
     if (!localCharacterProfile) return;
     document.getElementById('character-name-display').textContent = `${localCharacterProfile.name} (${localCharacterProfile.role})`;
     document.getElementById('sidebar-char-name').textContent = localCharacterProfile.name;
     document.getElementById('sidebar-char-role').textContent = localCharacterProfile.role;
     document.getElementById('sidebar-char-level').textContent = localCharacterProfile.level;
     document.getElementById('sidebar-char-xp').textContent = `${localCharacterProfile.xp}/${localCharacterProfile.level * 100}`;
     document.getElementById('sidebar-char-image').src = classImages[localCharacterProfile.role][localCharacterProfile.sex];
     updateCoinsUI(); // NOVO
     updateAttributeDisplay(); 
     updateHealthBars(); 
     updateSkillsList(); 
     updateInventoryUI(); 
     updateQuestsUI(); 
     updateRelationshipsUI(); 
     updateEquipmentUI(); // NOVO
     updateReputationUI(); // NOVO
     updateTimeUI(); // NOVO
     if (typeof updateDebugPanel === 'function') {
        updateDebugPanel(); // NOVO
     }
     updateChatInputStatus();
     document.getElementById('character-setup').style.display = 'none';
}

function resetGame() {
    if (confirm('Novo jogo? Progresso será perdido!')) {
        // CORREÇÃO: Esconde o menu principal para revelar a tela de criação.
        document.getElementById('main-menu').classList.add('hidden');

        localStorage.removeItem('eldoriaSave'); 
        localCharacterProfile = null; chatMessages = []; currentEnemy = null; isInCombat = false; selectedClass = null; skillPoints = 0;
        relationships = {}; gameMode = 'singleplayer'; storyMode = 'sandbox'; mainQuest = null; sideQuests = []; discoveredEnemies = [];
        coins = 0; // NOVO
        attributes = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
        
        document.getElementById('chat-area').innerHTML = '<div class="text-center text-gray-400 italic py-8">Crie seu personagem...</div>';
        document.getElementById('character-name-display').textContent = '...'; 
        document.getElementById('sidebar-char-name').textContent = '-'; 
        document.getElementById('sidebar-char-role').textContent = '-'; 
        document.getElementById('sidebar-char-level').textContent = '1'; 
        document.getElementById('sidebar-char-xp').textContent = '0/100';
        document.getElementById('sidebar-char-coins').textContent = '0'; // NOVO
        document.getElementById('sidebar-char-image').src = "https://placehold.co/64x64?text=?"; 
        
        // CORREÇÃO: Garante que o contêiner do jogo está visível antes de mostrar a criação de personagem.
        const gameWrapper = document.getElementById('game-wrapper');
        gameWrapper.classList.remove('hidden');
        gameWrapper.classList.add('flex');
        const userInput = document.getElementById('user-input');
        const sendButton = document.getElementById('send-button');
        if (userInput) userInput.disabled = false;
        if (sendButton) sendButton.disabled = true;
        
        document.getElementById('char-name-input').value = ''; 
        document.getElementById('char-sex-input').value = ''; 
        document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.story-mode-card').forEach(c => c.classList.remove('selected')); 
        document.querySelector('.story-mode-card[data-mode="sandbox"]').classList.add('selected');

        // Reseta o tempo
        gameTime = { day: 1, hour: 8 };
        updateTimeUI(); // NOVO
        
        document.getElementById('character-setup').style.display = 'flex'; 
        applyClassAttributes('Guerreiro'); 
        updateClassCardImages(); 
        updateQuestsUI(); 
        updateRelationshipsUI(); 
        updateEquipmentUI();
        updateReputationUI();
        updateChatInputStatus();
        updateTimeUI(); // NOVO
        if (typeof updateDebugPanel === 'function') {
            updateDebugPanel(); // NOVO
        }
    }
}

function updateTimeUI() {
    if (!gameTime) return;
    const hour = Math.floor(gameTime.hour);
    const minutes = Math.round((gameTime.hour - hour) * 60);
    const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    let period = 'Manhã';
    if (hour >= 12 && hour < 18) period = 'Tarde';
    else if (hour >= 18 || hour < 6) period = 'Noite';

    document.getElementById('time-day').textContent = gameTime.day;
    document.getElementById('time-hour').textContent = timeString;
    document.getElementById('time-period').textContent = period;
}

function startInitialStory() {
     let msg;
     if(localCharacterProfile) localCharacterProfile.statusEffects = []; // Zera efeitos no início
     mainQuest = { title: "Encontre seu Caminho", status: "Ativa", description: "O Oráculo Digital te convocou, descubra seu propósito em Eldoria." };
     
     if (storyMode === 'sandbox') {
         debouncedGenerateAIResponse("Inicie aventura sandbox para "+localCharacterProfile.name+", "+localCharacterProfile.role+" "+localCharacterProfile.sex+". Descreva o cenário inicial e pergunte o que fazer.", localCharacterProfile);
     } else {
         msg = `📜 A Profecia - ${localCharacterProfile.name}... **COMEÇA AGORA.**`; 
         addMessage(msg, 'ai');
         generateAIResponse("Inicie cena de abertura narrativa para "+localCharacterProfile.name+", "+localCharacterProfile.role+" "+localCharacterProfile.sex+" e apresente as opções A, B, C, D.", localCharacterProfile);
     }
     if (isMusicPlaying) {
        setMusicTrack(MUSIC_TRACKS.exploration);
     }
     updateRelationshipsUI(); 
     updateQuestsUI();
     updateTimeUI(); // NOVO
     if (typeof updateDebugPanel === 'function') {
        updateDebugPanel(); // NOVO
     }
}

// --- NOVO: Funções de Foco e Finalizador ---
function updateFocusBar() {
    if (!localCharacterProfile) return;
    const focusPercent = localCharacterProfile.focus || 0;
    document.getElementById('focus-bar').style.width = `${focusPercent}%`;

    const finisherBtn = document.getElementById('finisher-btn');
    if (focusPercent >= 100) {
        finisherBtn.classList.remove('hidden');
    } else {
        finisherBtn.classList.add('hidden');
    }
}

function useFinisher() {
    if (!localCharacterProfile || localCharacterProfile.focus < 100) return;

    const skill = FINISHER_SKILL;
    localCharacterProfile.focus = 0; // Consome todo o foco
    updateFocusBar();

    const bonus = Math.floor(attributes[skill.mainAttribute] / 2); // Bônus maior
    const baseDamage = 50; // Dano base alto
    let damageModifier = getStatusEffectValue(true, 'damage') - getStatusEffectValue(false, 'defense');
    let dmg = baseDamage + bonus + damageModifier;
    dmg = Math.floor(dmg * skill.damageMultiplier); // Multiplicador devastador

    currentEnemy.currentHP -= dmg;
    takeDamageVisual(dmg, true); // Sempre é crítico visualmente
    addMessage(`💥 Você canaliza toda sua energia em um **${skill.name}** devastador, causando ${dmg} de dano!`, 'ai', 'level-up');
    updateEnemyHPBar();
    if (currentEnemy && currentEnemy.currentHP > 0) setTimeout(enemyTurn, 1500);
}

// --- NOVO: Funções de Crafting ---
function openCraftingModal() {
    const modal = document.getElementById('crafting-modal');
    const content = document.getElementById('crafting-recipes-list');
    content.innerHTML = '';

    Object.values(CRAFTING_RECIPES).forEach(recipe => {
        const recipeEl = document.createElement('div');
        recipeEl.className = 'bounty-item'; // Reutilizando estilo

        const ingredientsHtml = recipe.ingredients.map(ing => `${ing.name} (x${ing.count})`).join(', ');
        const canCraft = recipe.ingredients.every(ing => {
            const itemCount = localCharacterProfile.inventory.filter(i => i === ing.name).length;
            return itemCount >= ing.count;
        });

        recipeEl.innerHTML = `
            <div class="bounty-title">Criar: ${recipe.product}</div>
            <div class="bounty-desc">${recipe.description}</div>
            <div class="text-xs text-gray-400 mt-2">Ingredientes: ${ingredientsHtml}</div>
            <button class="track-quest-button mt-2" ${canCraft ? '' : 'disabled'}>Criar Item</button>
        `;
        if (canCraft) {
            recipeEl.querySelector('button').onclick = () => craftItem(recipe);
        }
        content.appendChild(recipeEl);
    });

    modal.classList.remove('hidden');
}

function craftItem(recipe) {
    if (!localCharacterProfile) return;

    // Dupla checagem para garantir que tem os itens
    const canCraft = recipe.ingredients.every(ing => {
        const itemCount = localCharacterProfile.inventory.filter(i => i === ing.name).length;
        return itemCount >= ing.count;
    });

    if (canCraft) {
        // Remove ingredientes do inventário
        recipe.ingredients.forEach(ing => {
            for (let i = 0; i < ing.count; i++) {
                const itemIndex = localCharacterProfile.inventory.indexOf(ing.name);
                if (itemIndex > -1) localCharacterProfile.inventory.splice(itemIndex, 1);
            }
        });
        // Adiciona o produto
        localCharacterProfile.inventory.push(recipe.product);
        addMessage(`🛠️ Você criou ${recipe.product}!`, 'ai', 'level-up');
        updateInventoryUI();
        openCraftingModal(); // Atualiza o modal
    }
}

// --- NOVO: Funções do Bestiário ---
function openBestiaryModal() {
    const modal = document.getElementById('bestiary-modal');
    const listContent = document.getElementById('bestiary-list');
    const detailsContent = document.getElementById('bestiary-details');
    listContent.innerHTML = '';
    detailsContent.innerHTML = '<p class="text-gray-400 italic">Selecione um inimigo para ver os detalhes.</p>';

    if (discoveredEnemies.length === 0) {
        listContent.innerHTML = '<p class="text-gray-400 italic">Nenhum inimigo descoberto ainda.</p>';
    } else {
        discoveredEnemies.forEach(enemyName => {
            const enemyEl = document.createElement('div');
            enemyEl.className = 'bounty-item cursor-pointer hover:bg-primary-light'; // Reutilizando estilo
            enemyEl.textContent = enemyName;
            enemyEl.onclick = () => showBestiaryDetails(enemyName);
            listContent.appendChild(enemyEl);
        });
    }

    modal.classList.remove('hidden');
}

function showBestiaryDetails(enemyName) {
    const detailsContent = document.getElementById('bestiary-details');
    const enemyData = ENEMIES_DATA[enemyName];

    if (!enemyData) {
        detailsContent.innerHTML = '<p class="text-red-500">Erro: Dados não encontrados.</p>';
        return;
    }

    let skillsHtml = 'Nenhuma habilidade especial conhecida.';
    if (enemyData.skills && enemyData.skills.length > 1) { // Mostra apenas se tiver mais que o ataque básico
        skillsHtml = '<ul>' + enemyData.skills
            .filter(s => s.chance < 1.0) // Filtra ataques básicos que tem 100% de chance
            .map(s => `<li class="text-sm list-disc list-inside">${s.name}</li>`).join('') + '</ul>';
    }

    detailsContent.innerHTML = `
        <h3 class="creation-section-title">${enemyName}</h3>
        <p class="text-sm text-gray-300 mb-2"><strong>Nível:</strong> ${enemyData.level}</p>
        <p class="text-sm text-gray-400 italic mb-4">"${enemyData.description}"</p>
        <h4 class="font-bold text-sm text-yellow-400 mb-1">Habilidades Notáveis:</h4>
        ${skillsHtml}
    `;
}

// --- Funções de Efeitos de Status ---
function applyStatusEffect(targetIsPlayer, effectData) {
    const target = targetIsPlayer ? localCharacterProfile : currentEnemy; if (!target) return; if (!target.statusEffects) target.statusEffects = [];
    const existingEffectIndex = target.statusEffects.findIndex(e => e.stat === effectData.stat);
    if (existingEffectIndex > -1) { 
        target.statusEffects[existingEffectIndex].currentDuration = effectData.duration; // Renova
    } else { 
        target.statusEffects.push({ ...effectData, currentDuration: effectData.duration }); // Adiciona novo
    }
    displayStatusEffects(targetIsPlayer);
    let targetName = targetIsPlayer ? "Você está" : `${currentEnemy?.name || 'Inimigo'} está`;
    addMessage(`${targetName} ${effectData.stat}! (${effectData.duration} turnos)`, 'ai', 'spell');
}

function updateStatusEffects(targetIsPlayer) {
    const target = targetIsPlayer ? localCharacterProfile : currentEnemy; if (!target || !target.statusEffects || target.statusEffects.length === 0) return;
    let damageTakenFromDot = 0; 
    let targetAnchor = targetIsPlayer ? document.getElementById('hp-value') : document.getElementById('enemy-hp-anchor');
    
    target.statusEffects.forEach(effect => {
         if (effect.currentDuration > 0) {
             if (effect.stat === 'dot') {
                 let dotDamage = effect.value || 5;
                 if (targetIsPlayer) takeDamage(dotDamage); 
                 else if (currentEnemy) currentEnemy.currentHP -= dotDamage;
                 damageTakenFromDot += dotDamage;
             }
         }
    });
    
     if (damageTakenFromDot > 0 && targetAnchor) {
         showFloatingText(targetAnchor, `-${damageTakenFromDot} (DoT)`, '#ff8800');
         if(targetIsPlayer) updateHealthBars(); else updateEnemyHPBar();
         addMessage(`${targetIsPlayer ? "Você" : currentEnemy?.name || 'Inimigo'} sofre ${damageTakenFromDot} de dano contínuo.`, 'ai', 'combat');
     }
}

function clearExpiredEffects(targetIsPlayer) {
    const target = targetIsPlayer ? localCharacterProfile : currentEnemy; 
    if (target && target.statusEffects) {
         // Reduz a duração de todos os efeitos
         target.statusEffects.forEach(e => { if (e.currentDuration > 0) e.currentDuration--; });
         // Filtra os que expiraram
         const activeEffects = target.statusEffects.filter(e => e.currentDuration > 0);
         if(target.statusEffects.length !== activeEffects.length) { 
             target.statusEffects = activeEffects; 
             displayStatusEffects(targetIsPlayer); // Atualiza UI se algo expirou
         }
    }
}

function getStatusEffectValue(targetIsPlayer, effectStat) {
    const target = targetIsPlayer ? localCharacterProfile : currentEnemy; 
    if (!target || !target.statusEffects) return 0;
    return target.statusEffects
        .filter(e => e.stat === effectStat && e.currentDuration > 0)
        .reduce((sum, effect) => sum + (effect.value || 0), 0);
}

function displayStatusEffects(targetIsPlayer) {
     const target = targetIsPlayer ? localCharacterProfile : currentEnemy; 
     const displayElementId = targetIsPlayer ? 'player-status-effects' : 'enemy-status-effects';
     const displayElement = document.getElementById(displayElementId); 
     if (!displayElement) return; 
     displayElement.innerHTML = '';
     
     if (target && target.statusEffects && target.statusEffects.length > 0) {
         target.statusEffects.forEach(effect => {
             if (effect.currentDuration <= 0) return; // Não mostra efeitos expirados
             const effectSpan = document.createElement('span'); 
             let bgColor = 'bg-gray-500';
             if (effect.type === 'buff') bgColor = 'bg-green-600'; 
             else if (effect.type === 'debuff') bgColor = 'bg-red-600';
             effectSpan.className = `px-2 py-0.5 rounded text-white ${bgColor} text-xs shadow`;
             effectSpan.textContent = `${effect.stat} (${effect.currentDuration})`; 
             effectSpan.title = `Valor: ${effect.value || 'N/A'}`;
             displayElement.appendChild(effectSpan);
         });
     }
}


// =============================================
// EVENT LISTENERS E INICIALIZAÇÃO
// =============================================
window.addEventListener('load', () => {
    console.log("Window Loaded. Attaching listeners...");

    // Get Elements
    const saveCharBtn = document.getElementById('save-character-button');
    const sendBtn = document.getElementById('send-button');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');
    const resetBtn = document.getElementById('reset-game-button');
    const saveBtn = document.getElementById('save-game-button');
    const simCombatBtn = document.getElementById('simular-combate-btn');
    const attackBtn = document.getElementById('attack-btn');
    const skillBtn = document.getElementById('skill-btn');
    const itemBtn = document.getElementById('item-btn');
    const defendBtn = document.getElementById('defend-btn');
    const fleeBtn = document.getElementById('flee-btn');
    const closeItemsBtn = document.getElementById('close-items-modal');
    const userInpt = document.getElementById('user-input');
    const sexInput = document.getElementById('char-sex-input');
    const skillsModalBtn = document.getElementById('skills-modal-button');
    const closeSkillsBtn = document.getElementById('close-skills-modal');
    const questsModalBtn = document.getElementById('quests-modal-button');
    const closeQuestsBtn = document.getElementById('close-quests-modal');
    const relationshipsModalBtn = document.getElementById('relationships-modal-button');
    const closeRelationshipsBtn = document.getElementById('close-relationships-modal');
    const sendLetterBtn = document.getElementById('send-letter-btn'); // NOVO
    const cancelLetterBtn = document.getElementById('cancel-letter-btn'); // NOVO
    const craftingModalBtn = document.getElementById('crafting-modal-button'); // NOVO
    const closeCraftingBtn = document.getElementById('close-crafting-modal'); // NOVO
    const bestiaryModalBtn = document.getElementById('bestiary-modal-button'); // NOVO
    const closeBestiaryBtn = document.getElementById('close-bestiary-modal'); // NOVO

    const travelModalBtn = document.getElementById('travel-modal-button'); // NOVO
    const closeTravelModalBtn = document.getElementById('close-travel-modal'); // NOVO
    const finisherBtn = document.getElementById('finisher-btn'); // NOVO

    const stanceButtons = document.querySelectorAll('.stance-button'); // NOVO
    // NOVO: Botões e Modais de Loja e Recompensas
    const shopModalBtn = document.getElementById('shop-modal-button');
    const closeShopBtn = document.getElementById('close-shop-modal');
    const bountyBoardModalBtn = document.getElementById('bounty-board-modal-button');
    const closeBountyBoardBtn = document.getElementById('close-bounty-board-modal');

    // Novos elementos do Menu
    const newGameBtn = document.getElementById('new-game-btn');
    const loadGameBtn = document.getElementById('load-game-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const musicVolumeSlider = document.getElementById('music-volume-slider');
    const sfxVolumeSlider = document.getElementById('sfx-volume-slider');
    const ingameMenuBtn = document.getElementById('ingame-menu-button');
    const audioBtn = document.getElementById('audio-toggle-button');
    const debugToggleBtn = document.getElementById('debug-toggle-button'); // NOVO

    // Attach Listeners
    if (saveCharBtn) saveCharBtn.addEventListener('click', saveCharacterProfile); else console.error("Save button not found!");
    if (sendBtn) sendBtn.addEventListener('click', sendMessage); else console.error("Send button not found!");
    if (resetBtn) resetBtn.addEventListener('click', resetGame);
    if (saveBtn) saveBtn.addEventListener('click', saveGame);
    if (audioBtn) audioBtn.addEventListener('click', toggleMusic);
    if (debugToggleBtn) debugToggleBtn.addEventListener('click', toggleDebugPanel); // NOVO
    if (simCombatBtn) simCombatBtn.addEventListener('click', () => {
        if (!localCharacterProfile) { addMessage('❌ Crie um personagem!', 'ai'); return; }
        const lvl = localCharacterProfile.level; 
        const enemy = { name: `Simulador Lvl ${lvl}`, level: lvl, maxHP: 80+(lvl*20), currentHP: 80+(lvl*20), statusEffects: [] };
        addMessage(`⚙️ Iniciando simulação de combate contra ${enemy.name}!`, 'ai', 'spell'); 
        startCombat(enemy, true); // NOVO: true para simulação
    });
    if (attackBtn) attackBtn.addEventListener('click', playerAttack);
    if (skillBtn) skillBtn.addEventListener('click', () => {
        const section = document.getElementById('skills-section'); 
        section.classList.toggle('hidden'); 
        if (!section.classList.contains('hidden')) updateCombatSkills();
    });
    if (itemBtn) itemBtn.addEventListener('click', openCombatItemsModal);
    if (defendBtn) defendBtn.addEventListener('click', playerDefend);
    if (fleeBtn) fleeBtn.addEventListener('click', playerFlee);
    if (finisherBtn) finisherBtn.addEventListener('click', useFinisher); // NOVO
    if (closeItemsBtn) closeItemsBtn.addEventListener('click', () => document.getElementById('combat-items-modal').classList.add('hidden'));
    if (skillsModalBtn) skillsModalBtn.addEventListener('click', () => { document.getElementById('skills-modal').classList.remove('hidden'); updateSkillsModal(); });
    if (closeSkillsBtn) closeSkillsBtn.addEventListener('click', () => document.getElementById('skills-modal').classList.add('hidden'));
    // NOVO: Listeners das Cartas
    if (sendLetterBtn) sendLetterBtn.addEventListener('click', sendLetter);
    if (cancelLetterBtn) cancelLetterBtn.addEventListener('click', closeLetterModal);
    // NOVO: Listeners de Crafting
    if (craftingModalBtn) craftingModalBtn.addEventListener('click', openCraftingModal);
    if (closeCraftingBtn) closeCraftingBtn.addEventListener('click', () => document.getElementById('crafting-modal').classList.add('hidden'));
    // NOVO: Listeners do Bestiário
    if (bestiaryModalBtn) bestiaryModalBtn.addEventListener('click', openBestiaryModal);
    if (closeBestiaryBtn) closeBestiaryBtn.addEventListener('click', () => document.getElementById('bestiary-modal').classList.add('hidden'));
    // NOVO: Listeners de Viagem
    if (travelModalBtn) travelModalBtn.addEventListener('click', openTravelModal);
    if (closeTravelModalBtn) closeTravelModalBtn.addEventListener('click', () => document.getElementById('travel-modal').classList.add('hidden'));

    if (userInpt) userInpt.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    if (sexInput) sexInput.addEventListener('change', updateClassCardImages); 

    // Listeners do Menu Principal e Configurações
    if (newGameBtn) newGameBtn.addEventListener('click', () => {
        startAudioContext(); // Inicia o áudio com o primeiro clique
        resetGame();
    });
    if (loadGameBtn) loadGameBtn.addEventListener('click', () => {
        startAudioContext();
        if (!loadGame()) {
            alert("Nenhum jogo salvo encontrado.");
        }
    });
    if (settingsBtn) settingsBtn.addEventListener('click', () => document.getElementById('settings-modal').classList.remove('hidden'));
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => document.getElementById('settings-modal').classList.add('hidden'));

    // Listeners de Configurações
    if (musicVolumeSlider) musicVolumeSlider.addEventListener('input', (e) => {
        gameSettings.musicVolume = parseFloat(e.target.value);
        if (musicPlayer) musicPlayer.volume.value = Tone.gainToDb(gameSettings.musicVolume * 2);
    });
    if (sfxVolumeSlider) sfxVolumeSlider.addEventListener('input', (e) => {
        gameSettings.sfxVolume = parseFloat(e.target.value);
        if(synth) synth.volume.value = Tone.gainToDb(gameSettings.sfxVolume);
        localStorage.setItem('eldoriaSettings', JSON.stringify(gameSettings));
    });

    // --- NOVO: Lógica de Listeners Refatorada ---

    // Função auxiliar para adicionar listeners a modais
    const setupModal = (buttonId, modalId, openFn = null) => {
        const modal = document.getElementById(modalId);
        const openBtn = document.getElementById(buttonId);
        const closeBtn = modal.querySelector('[id^="close-"]'); // Encontra qualquer botão de fechar dentro do modal

        if (openBtn) openBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Previne o comportamento padrão de links <a>
            if (openFn) openFn();
            modal.classList.remove('hidden');
        });
        if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    };

    // Configura todos os modais
    setupModal('skills-modal-button', 'skills-modal', updateSkillsModal);
    setupModal('quests-modal-button', 'quests-modal');
    setupModal('relationships-modal-button', 'relationships-modal');
    setupModal('shop-modal-button', 'shop-modal', openShopModal);
    setupModal('bounty-board-modal-button', 'bounty-board-modal', openBountyBoardModal);
    setupModal('travel-modal-button', 'travel-modal', openTravelModal);
    setupModal('crafting-modal-button', 'crafting-modal', openCraftingModal);
    setupModal('bestiary-modal-button', 'bestiary-modal', openBestiaryModal);
    
    // Listeners que não são de modais
    if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
    stanceButtons.forEach(btn => btn.addEventListener('click', () => setCombatStance(btn.getAttribute('data-stance'))));
    document.getElementById('difficulty-buttons').addEventListener('click', (e) => {
        if (e.target.classList.contains('difficulty-button')) {
            gameSettings.difficulty = e.target.getAttribute('data-difficulty');
            updateDifficultyButtons();
            localStorage.setItem('eldoriaSettings', JSON.stringify(gameSettings));
        }
    });

    // Listeners do NOVO Menu de Jogo
    setupModal('ingame-menu-button', 'game-menu-modal');
    document.getElementById('menu-save-game-btn').addEventListener('click', saveGame);
    // CORREÇÃO: A linha abaixo estava com um bug, agora está correta.
    document.getElementById('menu-load-game-btn').addEventListener('click', () => {
        if (!loadGame()) alert("Nenhum jogo salvo encontrado.");
    });
    document.getElementById('menu-load-game-btn').addEventListener('click', () => { if(!loadGame()) alert("Nenhum jogo salvo."); });
    document.getElementById('menu-settings-btn').addEventListener('click', () => document.getElementById('settings-modal').classList.remove('hidden'));
    document.getElementById('menu-main-menu-btn').addEventListener('click', () => { if(confirm("Voltar ao menu principal? O progresso não salvo será perdido.")) window.location.reload(); });


    document.querySelectorAll('.class-card').forEach(card => {
        card.addEventListener('click', () => {
            // Garante que o contexto de áudio seja iniciado no primeiro clique, se ainda não estiver.
            // Isso é útil se o jogador interagir com a criação de personagem antes de iniciar o jogo.
            startAudioContext();

            // NOVO: Exibe a descrição da classe
            const className = card.getAttribute('data-class');
            const descriptionText = document.getElementById('class-description-text');
            if (descriptionText && classDescriptions[className]) {
                descriptionText.textContent = classDescriptions[className];
            }

            document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedClass = card.getAttribute('data-class');
            applyClassAttributes(selectedClass);
        });
    });
    document.querySelectorAll('.story-mode-card').forEach(card => {
        card.addEventListener('click', () => {
            startAudioContext();
            document.querySelectorAll('.story-mode-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            // storyMode é pego durante saveCharacterProfile
        });
    });

    // --- NOVO: Lógica para o menu "Ações no Mundo" ---
    const worldActionsButton = document.getElementById('world-actions-button');
    const worldActionsDropdown = document.getElementById('world-actions-dropdown');

    if (worldActionsButton) {
        worldActionsButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Impede que o clique feche o menu imediatamente
            worldActionsDropdown.classList.toggle('hidden');
        });
    }
    // Fecha o menu se clicar em qualquer outro lugar
    window.addEventListener('click', () => {
        if (worldActionsDropdown && !worldActionsDropdown.classList.contains('hidden')) {
            worldActionsDropdown.classList.add('hidden');
        }
    });

    // Lógica de Inicialização Revisada
    function initializeGame() {
        // Carrega configurações salvas
        const savedSettings = localStorage.getItem('eldoriaSettings');
        if (savedSettings) {
            gameSettings = JSON.parse(savedSettings);
        }
        // Aplica configurações na UI
        musicVolumeSlider.value = gameSettings.musicVolume;
        sfxVolumeSlider.value = gameSettings.sfxVolume;
        if (musicPlayer) musicPlayer.volume.value = Tone.gainToDb(gameSettings.musicVolume * 2); // Multiplica para dar mais alcance
        if(synth) synth.volume.value = Tone.gainToDb(gameSettings.sfxVolume);
        updateDifficultyButtons();

        // Mostra o botão de carregar se houver save
        if (!localStorage.getItem('eldoriaSave')) {
            loadGameBtn.classList.add('disabled-button');
            loadGameBtn.disabled = true;
        }

        // Toca a música do menu
        if (isMusicPlaying) {
            setMusicTrack(MUSIC_TRACKS.menu);
        }
    }

    function updateDifficultyButtons() {
        document.querySelectorAll('.difficulty-button').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-difficulty') === gameSettings.difficulty);
        });
    }
    initializeGame();

     console.log("Listeners attached. Game should be ready."); // Log final
}); // Fim do window.addEventListener('load')
