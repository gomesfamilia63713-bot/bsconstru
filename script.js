// ==========================================================================
// CONSTRUCONTROL PRO v2.5 — ENGINE COMPLETA COM CARIMBO GEOMAPEADO TIMEMARK
// ==========================================================================

let DB_FUNCIONARIOS = JSON.parse(localStorage.getItem('cc_funcionarios')) || [
    { id: 1, nome: "Carlos Silva", cargo: "Pedreiro", obraId: 1, frequencia: 0, ultimaProd: "-" },
    { id: 2, nome: "Marcos Souza", cargo: "Armador", obraId: 1, frequencia: 0, ultimaProd: "-" },
    { id: 3, nome: "Antônio Lima", cargo: "Mestre de Obras", obraId: 2, frequencia: 0, ultimaProd: "-" }
];

let DB_OBRAS = JSON.parse(localStorage.getItem('cc_obras')) || [
    { id: 1, nome: "Residencial Solarium", local: "Av. Paulista, 1000" },
    { id: 2, nome: "Condomínio Vista Verde", local: "Rua das Flores, 50" }
];

let DB_PRODUCAO = JSON.parse(localStorage.getItem('cc_producao')) || [];

function salvarBD() {
    localStorage.setItem('cc_funcionarios', JSON.stringify(DB_FUNCIONARIOS));
    localStorage.setItem('cc_obras', JSON.stringify(DB_OBRAS));
    localStorage.setItem('cc_producao', JSON.stringify(DB_PRODUCAO));
}

let isAdminLogado = false;
let streamCameraGlobal = null;
let enderecoCompletoGlobal = "Buscando localização detalhada...";

document.addEventListener("DOMContentLoaded", () => {
    atualizarSelects();
    switchTab('aba-ponto-funcionarios'); // Força a inicialização travada no ponto
    renderizarPainelGeral();
    renderizarFichasEfetivo();
    renderizarProducaoPorObra();
    configurarPlanilhasEditaveis();
});

function switchTab(tabId) {
    if (!isAdminLogado && tabId !== 'aba-ponto-funcionarios') {
        return;
    }

    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const abaAlvo = document.getElementById(tabId);
    if (abaAlvo) {
        abaAlvo.style.display = 'block';
        abaAlvo.classList.add('active');
    }
    const btnMenu = Array.from(document.querySelectorAll('.nav-btn')).find(btn => {
        const onclickAttr = btn.getAttribute('onclick');
        return onclickAttr && onclickAttr.includes(tabId);
    });
    if (btnMenu) btnMenu.classList.add('active');
}

function cancelarSelecaoPonto() {
    document.getElementById('select-ponto-publico').value = "";
}

// --- ENGINE REVOLUCIONÁRIA DE EXPORTAÇÃO EXCEL (PC E CELULAR) ---
function exportarTabelaParaExcel(idTabela, nomeArquivo) {
    const tabela = document.getElementById(idTabela);
    if (!tabela) return;

    let conteudoCSV = "\uFEFF"; 
    const linhas = tabela.querySelectorAll("tr");

    linhas.forEach(linha => {
        const colunas = line.querySelectorAll("th, td");
        let dadosLinha = [];
        
        colunas.forEach(coluna => {
            let textoCelula = coluna.innerText.replace(/"/g, '""').trim();
            if (textoCelula.includes("Ver Ficha")) textoCelula = textoCelula.replace("Ver Ficha →", "").trim();
            dadosLinha.push('"' + textoCelula + '"');
        });

        conteudoCSV += dadosLinha.join(";") + "\r\n"; 
    });

    const blob = new Blob([conteudoCSV], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    
    if (navigator.msSaveBlob) { 
        navigator.msSaveBlob(blob, nomeArquivo + ".csv");
    } else {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", nomeArquivo + ".csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// --- ADAPTADOR DE EDICÃO DE PLANILHA EM TEMPO REAL ---
function configurarPlanilhasEditaveis() {
    document.querySelectorAll('table').forEach(tabela => {
        tabela.addEventListener('blur', (evento) => {
            const celula = evento.target;
            if (celula.tagName === 'TD' && celula.hasAttribute('contenteditable')) {
                const linha = celula.parentElement;
                const idFuncionario = linha.getAttribute('data-id');
                const colunaIndex = celula.cellIndex;
                const novoValor = celula.innerText.trim();

                if (idFuncionario) {
                    const func = DB_FUNCIONARIOS.find(f => f.id == idFuncionario);
                    if (func) {
                        if (colunaIndex === 0) func.nome = novoValor;
                        if (colunaIndex === 1) func.cargo = novoValor;
                        if (colunaIndex === 3 || (colunaIndex === 2 && tabela.id === "tabela-fichas-efetivo")) {
                            func.frequencia = parseInt(novoValor) || 0;
                        }
                        salvarBD();
                        renderizarPainelGeral();
                        renderizarFichasEfetivo();
                        renderizarProducaoPorObra();
                    }
                }
            }
        }, true);
    });
}

// --- CONTROLE DE ACESSO (SEM DICA DE SENHA) ---
function lidarBotaoLogin() {
    const btn = document.getElementById('btn-estado-login');
    const sidebar = document.getElementById('sidebar-admin');

    if (!isAdminLogado) {
        let senha = prompt("Digite a senha de administrador:");
        if (senha && senha.toLowerCase().trim() === "admin") {
            isAdminLogado = true;
            btn.innerHTML = '<i class="fa-solid fa-unlock"></i> SAIR DO PAINEL';
            btn.style.backgroundColor = '#22c55e';
            sidebar.style.display = 'flex'; 
            switchTab('painel-geral'); 
        } else { 
            alert("Senha incorreta!"); 
        }
    } else {
        isAdminLogado = false;
        btn.innerHTML = '<i class="fa-solid fa-lock"></i> ÁREA DO PATRÃO';
        btn.style.backgroundColor = '';
        sidebar.style.display = 'none'; 
        switchTab('aba-ponto-funcionarios'); 
    }
}

function imprimirAba() {
    window.print();
}

function atualizarSelects() {
    const selectPonto = document.getElementById('select-ponto-publico');
    const selectProdFunc = document.getElementById('prod-funcionario');
    const selectAddFuncObra = document.getElementById('func-obra-inicial');
    const selectFiltroObra = document.getElementById('filtro-obra-analise');

    if (selectPonto) selectPonto.innerHTML = '<option value="">-- Escolha seu Nome na Lista --</option>' + DB_FUNCIONARIOS.map(f => `<option value="${f.nome}">${f.nome} (${f.cargo})</option>`).join('');
    if (selectProdFunc) selectProdFunc.innerHTML = '<option value="">-- Escolha o Operário --</option>' + DB_FUNCIONARIOS.map(f => `<option value="${f.nome}">${f.nome}</option>`).join('');
    if (selectAddFuncObra) selectAddFuncObra.innerHTML = DB_OBRAS.map(o => `<option value="${o.id}">${o.nome}</option>`).join('');
    if (selectFiltroObra) selectFiltroObra.innerHTML = '<option value="">-- Escolha a Obra para Filtrar --</option>' + DB_OBRAS.map(o => `<option value="${o.id}">${o.nome}</option>`).join('');
}

// ==========================================================================
// TERMINAL DE CAMERAS, GEOCODIFICAÇÃO REAL (NOMINATIM) E CARIMBO TIMEMARK
// ==========================================================================
function solicitarPontoPublico() {
    const nomeSelecionado = document.getElementById('select-ponto-publico').value;
    if (!nomeSelecionado) { alert("Selecione seu nome antes de bater o ponto!"); return; }

    document.getElementById('modal-ponto').style.display = 'flex';
    document.getElementById('modal-ponto-titulo').innerText = `Registrar Ponto: ${nomeSelecionado}`;

    const video = document.getElementById('ponto-video');
    const gpsStatus = document.getElementById('modal-ponto-gps');
    gpsStatus.innerHTML = `📡 Sintonizando satélites GPS e câmera...`;
    
    enderecoCompletoGlobal = "Buscando localização detalhada...";

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
        .then(stream => { streamCameraGlobal = stream; video.srcObject = stream; })
        .catch(() => alert("Erro ao inicializar câmera do dispositivo."));

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            
            gpsStatus.innerHTML = `📍 Coordenadas obtidas. Traduzindo endereço...`;

            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`, {
                headers: { 'User-Agent': 'ConstruControlPRO/2.5' }
            })
            .then(res => res.json())
            .then(dados => {
                const add = dados.address || {};
                const rua = add.road || add.pedestrian || "Rua não identificada";
                const bairro = add.suburb || add.neighbourhood || "Bairro não mapeado";
                const cep = add.postcode || "CEP indisponível";
                const cidade = add.city || add.town || "";

                enderecoCompletoGlobal = `RUA: ${rua}\nBAIRRO: ${bairro} | CEP: ${cep}\nCIDADE: ${cidade} (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
                gpsStatus.innerHTML = `📍 Localizado: ${rua}, ${bairro} - CEP: ${cep}`;
            })
            .catch(() => {
                enderecoCompletoGlobal = `Lat: ${lat.toFixed(5)} | Lon: ${lon.toFixed(5)}\n(Sem conexão para traduzir CEP)`;
                gpsStatus.innerHTML = `📍 Travado por Coordenadas: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
            });

        }, () => { 
            enderecoCompletoGlobal = "GPS Indisponível (Ponto batido sem rastreamento de satélite)";
            gpsStatus.innerHTML = "❌ Sem sinal de GPS ou permissão negada."; 
        }, { enableHighAccuracy: true, timeout: 10000 });
    }
}

function fecharModalPonto() {
    document.getElementById('modal-ponto').style.display = 'none';
    if (streamCameraGlobal) streamCameraGlobal.getTracks().forEach(track => track.stop());
}

function confirmarPontoPublico() {
    const nome = document.getElementById('select-ponto-publico').value;
    const video = document.getElementById('ponto-video');
    
    const canvas = document.createElement('canvas');
    canvas.width = 640; 
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(video, 0, 0, 640, 480);

    // --- CARIMBO ESTILO TIMEMARK ---
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(15, 330, 610, 135);
    
    ctx.fillStyle = "#f39c12";
    ctx.fillRect(15, 330, 6, 135);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px 'Segoe UI', Arial, sans-serif";
    const dataHora = new Date().toLocaleString('pt-BR');
    ctx.fillText(`OPERÁRIO: ${nome.toUpperCase()}`, 35, 360);
    
    ctx.fillStyle = "#f39c12";
    ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
    ctx.fillText(`📅 ${dataHora}`, 35, 385);

    ctx.fillStyle = "#e0e0e5";
    ctx.font = "600 12px 'Segoe UI', Arial, sans-serif";
    
    const linhasEndereco = enderecoCompletoGlobal.split('\n');
    let alturaLinha = 410;
    linhasEndereco.forEach(linha => {
        ctx.fillText(linha, 35, alturaLinha);
        alturaLinha += 20;
    });

    const fotoFinalComCarimbo = canvas.toDataURL('image/jpeg');
    const funcionario = DB_FUNCIONARIOS.find(f => f.nome === nome);
    
    if (funcionario) {
        funcionario.frequencia += 1;
        funcionario.ultimaProd = "Ponto Batido ✔️";
        
        DB_PRODUCAO.push({
            funcionario: nome,
            volume: "Frequência Homologada (TimeMark)",
            data: dataHora,
            obraId: funcionario.obraId,
            fotoCartao: fotoFinalComCarimbo
        });

        salvarBD();
        renderizarPainelGeral();
        renderizarFichasEfetivo();
        renderizarProducaoPorObra();
        alert("Ponto armazenado com carimbo de endereço completo!");
    }
    fecharModalPonto();
}

// --- RENDERIZADORES ---
function renderizarPainelGeral() {
    if (document.getElementById('card-total-obras')) document.getElementById('card-total-obras').innerText = DB_OBRAS.length;
    if (document.getElementById('card-total-func')) document.getElementById('card-total-func').innerText = DB_FUNCIONARIOS.length;
    if (document.getElementById('card-total-prod')) document.getElementById('card-total-prod').innerText = DB_PRODUCAO.length;

    const tbody = document.getElementById('tbody-geral');
    if (!tbody) return;

    tbody.innerHTML = DB_FUNCIONARIOS.map(f => {
        const obraObj = DB_OBRAS.find(o => o.id == f.obraId);
        return `
            <tr data-id="${f.id}">
                <td contenteditable="true"><strong>${f.nome}</strong></td>
                <td contenteditable="true">${f.cargo}</td>
                <td><span class="badge-obra">${obraObj ? obraObj.nome : "Sem Alocação"}</span></td>
                <td contenteditable="true" style="color: var(--neon-green); font-weight:bold;">${f.frequencia}</td>
                <td><span style="color: var(--accent-orange);">${f.ultimaProd}</span></td>
            </tr>
        `;
    }).join('');
}

function renderizarFichasEfetivo() {
    const tbody = document.getElementById('tbody-fichas');
    if (!tbody) return;

    tbody.innerHTML = DB_FUNCIONARIOS.map(f => `
        <tr class="row-clicavel" data-id="${f.id}" onclick="abrirFichaOperario(${f.id})">
            <td><i class="fa-solid fa-folder-open" style="color:var(--accent-orange); margin-right:8px;"></i> <strong>${f.nome}</strong></td>
            <td>${f.cargo}</td>
            <td>${f.frequencia} dias</td>
            <td><span style="color:var(--neon-blue); font-size:13px;">Ver Ficha Individual &rarr;</span></td>
        </tr>
    `).join('');
}

function renderizarProducaoPorObra() {
    const idObraFiltrada = document.getElementById('filtro-obra-analise').value;
    const titulo = document.getElementById('titulo-obra-filtrada');
    const tbody = document.getElementById('tbody-por-obra');
    if (!tbody) return;

    if (!idObraFiltrada) {
        titulo.innerText = "Selecione uma obra no campo acima";
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Nenhum canteiro selecionado.</td></tr>`;
        return;
    }

    const obraSelecionada = DB_OBRAS.find(o => o.id == idObraFiltrada);
    titulo.innerText = `Frente de Trabalho: ${obraSelecionada ? obraSelecionada.nome : ''}`;
    const operariosFiltrados = DB_FUNCIONARIOS.filter(f => f.obraId == idObraFiltrada);

    tbody.innerHTML = operariosFiltrados.map(f => `
        <tr data-id="${f.id}">
            <td><strong>${f.nome}</strong></td>
            <td>${f.cargo}</td>
            <td>${f.frequencia} Presenças</td>
            <td>${f.ultimaProd}</td>
        </tr>
    `).join('');
}

function abrirFichaOperario(id) {
    const func = DB_FUNCIONARIOS.find(f => f.id == id);
    if (!func) return;

    const obraObj = DB_OBRAS.find(o => o.id == func.obraId);
    const registroProducao = DB_PRODUCAO.filter(p => p.funcionario === func.nome && p.fotoCartao).pop();

    document.getElementById('ficha-nome-titulo').innerText = `Ficha Funcional: ${func.nome}`;
    
    const imgElement = document.getElementById('ficha-foto-img');
    const txtSemFoto = document.getElementById('ficha-sem-foto-txt');

    if (registroProducao && registroProducao.fotoCartao) {
        imgElement.src = registroProducao.fotoCartao;
        imgElement.style.display = 'block';
        txtSemFoto.style.display = 'none';
    } else {
        imgElement.style.display = 'none';
        txtSemFoto.style.display = 'block';
    }

    document.getElementById('ficha-dados-texto').innerHTML = `
        <p><strong>Cargo/Profissão:</strong> ${func.cargo}</p>
        <p><strong>Canteiro Alocado:</strong> ${obraObj ? obraObj.nome : 'Nenhum'}</p>
        <p><strong>Endereço da Obra:</strong> ${obraObj ? obraObj.local : '-'}</p>
        <p><strong>Frequência Acumulada:</strong> ${func.frequencia} dias trabalhados</p>
        <p><strong>Último Histórico:</strong> ${func.ultimaProd}</p>
    `;

    document.getElementById('modal-ficha').style.display = 'flex';
}

function fecharModalFicha() {
    document.getElementById('modal-ficha').style.display = 'none';
}

// --- FORMULÁRIOS DE REGISTRO ---
document.getElementById('form-producao')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nomeFunc = document.getElementById('prod-funcionario').value;
    const volumeProd = document.getElementById('prod-quantidade').value;
    const funcionario = DB_FUNCIONARIOS.find(f => f.nome === nomeFunc);
    if (funcionario) {
        funcionario.ultimaProd = volumeProd;
        DB_PRODUCAO.push({ funcionario: nomeFunc, volume: volumeProd, data: new Date().toLocaleDateString('pt-BR'), obraId: funcionario.obraId });
        salvarBD(); renderizarPainelGeral(); renderizarProducaoPorObra();
        e.target.reset(); alert(`Produção registrada!`);
    }
});

document.getElementById('form-add-funcionario')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('func-nome').value;
    const cargo = document.getElementById('func-cargo').value;
    const obraId = parseInt(document.getElementById('func-obra-inicial').value);
    const novoId = DB_FUNCIONARIOS.length ? Math.max(...DB_FUNCIONARIOS.map(f => f.id)) + 1 : 1;
    DB_FUNCIONARIOS.push({ id: novoId, nome, cargo, obraId, frequencia: 0, ultimaProd: "-" });
    salvarBD(); atualizarSelects(); renderizarPainelGeral(); renderizarFichasEfetivo();
    e.target.reset(); alert(`Operário Registrado!`);
});

document.getElementById('form-add-obra')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('obra-nome').value;
    const local = document.getElementById('obra-local').value;
    const novoId = DB_OBRAS.length ? Math.max(...DB_OBRAS.map(o => o.id)) + 1 : 1;
    DB_OBRAS.push({ id: novoId, nome, local });
    salvarBD(); atualizarSelects(); renderizarPainelGeral();
    e.target.reset(); alert(`Canteiro Integrado!`);
});

function carregarProjetoPlanta(event) {
    const arquivo = event.target.files[0];
    const status = document.getElementById('preview-projeto-status');
    const iframeViewer = document.getElementById('viewer-pdf-projeto');
    const imgViewer = document.getElementById('viewer-img-projeto');

    if (!arquivo) return;

    iframeViewer.style.display = 'none';
    imgViewer.style.display = 'none';
    status.style.display = 'none';

    const urlArquivo = URL.createObjectURL(arquivo);

    if (arquivo.type === "application/pdf") {
        iframeViewer.src = urlArquivo;
        iframeViewer.style.display = 'block';
    } else if (arquivo.type.startsWith("image/")) {
        imgViewer.src = urlArquivo;
        imgViewer.style.display = 'block';
    } else {
        status.style.display = 'block';
        status.innerHTML = `<p>Formato inválido. Carregue PDF ou Imagens.</p>`;
    }
    }
