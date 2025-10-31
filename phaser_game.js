// phaser_game.js

// --- DEFINIÇÃO DA CENA PRIMEIRO ---
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' }); // Dá um nome (chave) para a cena
    }

    preload() {
        // Função para carregar assets (imagens, sons, mapas)
        console.log("BootScene: preload");
        this.load.image('guerreiro_sprite', 'assets/sprites/Guerreiro.png');
        console.log("BootScene: Tentando carregar guerreiro_sprite...");
    }

    create() {
        // Função chamada após o preload, para configurar a cena
        console.log("BootScene: create");
        this.cameras.main.setBackgroundColor('#000000'); // Define o fundo como preto

        // Exibindo a imagem
        if (this.textures.exists('guerreiro_sprite')) {
            console.log("BootScene: Textura 'guerreiro_sprite' existe. Adicionando imagem...");
            let guerreiro = this.add.image(config.width / 2, config.height / 2, 'guerreiro_sprite');

            // Deixar a imagem pixelada
            guerreiro.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

            // Aumentar/Diminuir o tamanho da imagem (ajuste o número conforme necessário)
            guerreiro.setScale(0.2); // << LINHA DESCOMENTADA E COM VALOR 0.1

            // Log que confirma a escala foi aplicada
            console.log("BootScene: Imagem 'guerreiro_sprite' adicionada e escalonada."); // << LOG CORRETO

        } else {
            console.error("BootScene: Erro! Textura 'guerreiro_sprite' não foi carregada corretamente no preload.");
            this.add.text(config.width / 2, config.height / 2, 'Erro ao carregar sprite!', { color: '#ff0000', fontSize: '20px' }).setOrigin(0.5);
        }
    }

    update() {
        // Função chamada a cada frame
        // Nada aqui por enquanto
    }
}
// --- FIM DA DEFINIÇÃO DA CENA ---


// --- CONFIGURAÇÃO DO JOGO (USA A CENA DEFINIDA ACIMA) ---
const config = {
    type: Phaser.AUTO,
    width:  'game-container',
    scene: [BootScene] // Agora BootScene já existe!
};

//window.addEventListener('load', () => {
ig);
});

console.log("phaser_game.js carregado. Iniciando Phaser...");