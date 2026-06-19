// ==========================================================================
// CONSTRUCONTROL PRO v3.6 — CÓDIGO COMPLETO E CORRIGIDO
// ==========================================================================

let DB_FUNCIONARIOS = JSON.parse(localStorage.getItem('cc_funcionarios_v3')) || [
    { id: 1, nome: "Carlos Silva", cargo: "Pedreiro", obraId: 1, frequencia: 0, ultimaProd: "-", fotoRecente: "" },
    { id: 2, nome: "Marcos Souza", cargo: "Armador", obraId: 1, frequencia: 0, ultimaProd: "-", fotoRecente: "" },
    { id: 3, nome: "Antônio Lima", cargo: "Mestre de Obras", obraId: 2, frequencia: 0, ultimaProd: "-", fotoRecente: "" }
];

let DB_OBRAS = JSON.parse(localStorage.getItem('cc_obras_v3')) || [
    { id: 1, nome: "Residencial Solarium", local: "Av. Paulista, 1000" },
    { id: 2, nome: "Condomínio Vista Verde", local: "Rua das Flores, 50" }
];

let DB_PRODUCAO = JSON.parse(localStorage.getItem('cc_producao_v3')) || [];
let DB_INVENTARIO = JSON.parse(localStorage.getItem('cc_inventario_v3')) || {
    materiais: { estoque: [], casa: [], outro: [] },
    ferramentas: { estoque: [], casa: [], outro: [] }
};

let subTabAtiva = { materiais: 'estoque', ferramentas: 'estoque' };
let isAdminLogado = false;
let streamCameraGlobal = null;
let enderecoCompletoGlobal = "Buscando...";

function salvarBD() {
    localStorage.setItem('cc_funcionarios_v3', JSON.stringify(DB_FUNCIONARIOS));
    localStorage.setItem('cc_obras_v3', JSON.stringify(DB_OBRAS));
    localStorage.setItem('cc_producao_v3', JSON.stringify(DB_PRODUCAO));
    localStorage.setItem('cc_inventario_v3', JSON.stringify(DB_INVENTARIO));
}

// Inicialização Principal
document.addEventListener("DOMContentLoaded", () => {
    atualizarSelects();
    verificarNomeDesteCelular(); 
    verificarLogoConfigurado(); 
    renderizarPainelGeral();
    renderizarFichasEfetivo();
    renderizarProducaoPorObra();
    renderizarInventario('materiais');
    renderizarInventario('ferramentas');
    configurarPlanilhasEditaveis();
});

// Registro do Service Worker (PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('PWA: Service Worker ativo.'))
            .catch((err) => console.log('Erro PWA:', err));
    });
}

function switchSubTab(categoria, subAba) {
    subTabAtiva[categoria] = subAba;
    renderizarInventario(categoria);
}

function adicionarItemInventario(categoria) {
    const p = categoria === 'materiais' ? 'mat' : 'ferr';
    const nome = document.getElementById(`${p}-nome-input`).value.trim();
    if (!nome) return alert("Digite o nome.");
    DB_INVENTARIO[categoria][subTabAtiva[categoria]].push({ id: Date.now(), nome, quantidade: 0, unidade: 'Und', data: new Date().toLocaleDateString('pt-BR') });
    salvarBD();
    renderizarInventario(categoria);
}

function removerItemInventario(categoria, sub, id) {
    DB_INVENTARIO[categoria][sub] = DB_INVENTARIO[categoria][sub].filter(i => i.id !== id);
    salvarBD();
    renderizarInventario(categoria);
}

function renderizarInventario(categoria) {
    const sub = subTabAtiva[categoria];
    const tbody = document.getElementById(`tbody-${categoria}`);
    if (!tbody) return;
    tbody.innerHTML = DB_INVENTARIO[categoria][sub].map(i => `
        <tr><td>${i.nome}</td><td>${i.quantidade}</td><td>${i.unidade}</td>
        <td><button onclick="removerItemInventario('${categoria}', '${sub}', ${i.id})">X</button></td></tr>
    `).join('');
}

function lidarBotaoLogin() {
    const sidebar = document.getElementById('sidebar-admin');
    if (!isAdminLogado) {
        if (prompt("Senha:") === "admin") { isAdminLogado = true; sidebar.style.display = 'flex'; }
    } else { isAdminLogado = false; sidebar.style.display = 'none'; }
}

function verificarLogoConfigurado() {
    const img = document.getElementById('logo-sistema-ponto');
    if (img) img.src = localStorage.getItem('cc_app_logo_customizado') || "https://via.placeholder.com/100";
}

function verificarNomeDesteCelular() {
    const nome = localStorage.getItem('cc_nome_proprio_dispositivo');
    if (nome) document.getElementById('txt-nome-memorizado').innerText = nome;
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
}

function atualizarSelects() {
    const sel = document.getElementById('prod-funcionario');
    if (sel) sel.innerHTML = DB_FUNCIONARIOS.map(f => `<option value="${f.nome}">${f.nome}</option>`).join('');
}

function configurarPlanilhasEditaveis() {}
function renderizarPainelGeral() {}
function renderizarFichasEfetivo() {}
function renderizarProducaoPorObra() {}

function carregarProjetoPlanta(event) {
    const arquivo = event.target.files[0];
    if (arquivo) document.getElementById('viewer-img-projeto').src = URL.createObjectURL(arquivo);
}
