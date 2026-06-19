// ==========================================================================
// CONSTRUCONTROL PRO v3.6 — CONTROLE INTEGRADO DE MATERIAIS E FERRAMENTAS
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

// Banco de dados para a estrutura de sub-abas de Materiais e Ferramentas
let DB_INVENTARIO = JSON.parse(localStorage.getItem('cc_inventario_v3')) || {
    materiais: { estoque: [], casa: [], outro: [] },
    ferramentas: { estoque: [], casa: [], outro: [] }
};

// Estados ativos das sub-abas internas
let subTabAtiva = {
    materiais: 'estoque',
    ferramentas: 'estoque'
};

function salvarBD() {
    localStorage.setItem('cc_funcionarios_v3', JSON.stringify(DB_FUNCIONARIOS));
    localStorage.setItem('cc_obras_v3', JSON.stringify(DB_OBRAS));
    localStorage.setItem('cc_producao_v3', JSON.stringify(DB_PRODUCAO));
    localStorage.setItem('cc_inventario_v3', JSON.stringify(DB_INVENTARIO));
}

let isAdminLogado = false;
let streamCameraGlobal = null;
let enderecoCompletoGlobal = "Buscando localização detalhada...";

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

// ==========================================================================
// CONTROLADORES DE SUB-ABAS (MATERIAIS E FERRAMENTAS)
// ==========================================================================

function switchSubTab(categoria, subAba) {
    subTabAtiva[categoria] = subAba;
    
    // Atualiza o estado visual dos botões de sub-aba
    const container = document.querySelector(`#aba-${categoria} .sub-tabs-container`);
    if(container) {
        container.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active'));
        const btnAlvo = Array.from(container.querySelectorAll('.sub-tab-btn')).find(btn => btn.getAttribute('onclick').includes(`'${subAba}'`));
        if (btnAlvo) btnAlvo.classList.add('active');
    }

    renderizarInventario(categoria);
}

function adicionarItemInventario(categoria) {
    const prefixo = categoria === 'materiais' ? 'mat' : 'ferr';
    const inputNome = document.getElementById(`${prefixo}-nome-input`);
    const inputQtd = document.getElementById(`${prefixo}-qtd-input`);
    const inputUnid = document.getElementById(`${prefixo}-unid-input`);

    const nome = inputNome.value.trim();
    const qtd = parseInt(inputQtd.value) || 0;
    const unid = inputUnid.value.trim() || 'Und';

    if (!nome) {
        alert("Digite o nome da especificação para cadastrar.");
        return;
    }

    const sub = subTabAtiva[categoria];
    const novoItem = {
        id: Date.now(),
        nome: nome,
        quantidade: qtd,
        unidade: unid,
        data: new Date().toLocaleDateString('pt-BR')
    };

    DB_INVENTARIO[categoria][sub].push(novoItem);
    salvarBD();
    renderizarInventario(categoria);

    // Limpa inputs
    inputNome.value = '';
    inputQtd.value = '';
    inputUnid.value = '';
}

function removerItemInventario(categoria, sub, idItem) {
    if (confirm("Remover este registro definitivamente do sistema?")) {
        DB_INVENTARIO[categoria][sub] = DB_INVENTARIO[categoria][sub].filter(item => item.id !== idItem);
        salvarBD();
        renderizarInventario(categoria);
    }
}

function renderizarInventario(categoria) {
    const sub = subTabAtiva[categoria];
    const tbody = document.getElementById(`tbody-${categoria}`);
    if (!tbody) return;

    const listaItens = DB_INVENTARIO[categoria][sub] || [];

    if (listaItens.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); font-size: 13px;">Nenhum item cadastrado nesta sub-aba (${sub.toUpperCase()}).</td></tr>`;
        return;
    }

    tbody.innerHTML = listaItens.map(item => `
        <tr data-id="${item.id}" data-cat="${categoria}" data-sub="${sub}">
            <td contenteditable="true"><strong>${item.nome}</strong></td>
            <td contenteditable="true" style="color:var(--accent-orange); font-weight:700;">${item.quantidade}</td>
            <td contenteditable="true">${item.unidade}</td>
            <td><span style="font-size:12px; color:var(--text-muted);">${item.data}</span></td>
            <td style="text-align:center;">
                <button class="btn-delete-row" onclick="removerItemInventario('${categoria}', '${sub}', ${item.id})">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        </tr>
    `).join('');
}


// ==========================================================================
// FUNÇÕES HISTÓRICAS DO SISTEMA
// ==========================================================================

function verificarLogoConfigurado() {
    const logoSalvo = localStorage.getItem('cc_app_logo_customizado');
    const imgLogo = document.getElementById('logo-sistema-ponto');
    const inputUrl = document.getElementById('config-logo-url');

    if (imgLogo) {
        if (logoSalvo) {
            imgLogo.src = logoSalvo;
            if (inputUrl) inputUrl.value = logoSalvo.startsWith('data:image') ? '' : logoSalvo;
        } else {
            imgLogo.src = "https://via.placeholder.com/100/1a1a1e/ffffff?text=LOGO";
            if (inputUrl) inputUrl.value = '';
        }
    }
}

function salvarLogoAdmin(url) {
    if (url.trim() === '') return;
    localStorage.setItem('cc_app_logo_customizado', url.trim());
    verificarLogoConfigurado();
}

function carregarLogoArquivoAdmin(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        localStorage.setItem('cc_app_logo_customizado', e.target.result);
        verificarLogoConfigurado();
        alert("Imagem carregada da galeria e aplicada com sucesso!");
    };
    reader.readAsDataURL(arquivo);
}

function restaurarLogoPadrao() {
    localStorage.removeItem('cc_app_logo_customizado');
    const fileInput = document.getElementById('config-logo-file');
    if (fileInput) fileInput.value = '';
    verificarLogoConfigurado();
    alert("Logo padrão restaurado.");
}

function verificarNomeDesteCelular() {
    const nomeSalvo = localStorage.getItem('cc_nome_proprio_dispositivo');
    const instrucao = document.getElementById('ponto-card-instrucao');
    const boxConfig = document.getElementById('box-ponto-config-inicial');
    const boxUsuario = document.getElementById('box-ponto-usuario-salvo');
    const txtNome = document.getElementById('txt-nome-memorizado');

    if (nomeSalvo) {
        instrucao.innerText = "Reconhecimento Ativo via Dispositivo";
        boxConfig.style.display = 'none';
        boxUsuario.style.display = 'block';
        txtNome.innerText = nomeSalvo;
    } else {
        instrucao.innerText = "Configuração do Primeiro Acesso";
        boxConfig.style.display = 'block';
        boxUsuario.style.display = 'none';
    }
}

function salvarNomeNesteCelular() {
    const nomeInformado = document.getElementById('input-nome-celular').value.trim();
    if (!nomeInformado) {
        alert("Por favor, digite seu nome completo para salvar.");
        return;
    }
    localStorage.setItem('cc_nome_proprio_dispositivo', nomeInformado);
    verificarNomeDesteCelular();
}

function limparNomeCelular() {
    if (confirm("Deseja apagar ou trocar o nome gravado neste celular? (Isso não altera seu cadastro na empresa)")) {
        localStorage.removeItem('cc_nome_proprio_dispositivo');
        document.getElementById('input-nome-celular').value = "";
        verificarNomeDesteCelular();
    }
}

function switchTab(tabId) {
    if (!isAdminLogado && tabId !== 'aba-ponto-funcionarios') return;

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

function exportarTabelaParaExcel(idTabela, nomeArquivo) {
    const tabela = document.getElementById(idTabela);
    if (!tabela) return;

    let conteudoCSV = "\uFEFF"; 
    const linhas = tabela.querySelectorAll("tr");

    linhas.forEach(linha => {
        const colunas = linha.querySelectorAll("th, td");
        let dadosLinha = [];
        colunas.forEach((coluna, index) => {
            // Ignorar a última coluna de ações/exclusão na exportação
            if (linha.parentElement.tagName === 'TBODY' && index === colunas.length - 1 && coluna.querySelector('.btn-delete-row')) return;
            
            let texto = coluna.innerText.replace(/"/g, '""').trim();
            if (texto.includes("Inspecionar Histórico")) texto = texto.replace("Inspecionar Histórico →", "").trim();
            dadosLinha.push('"' + texto + '"');
        });
        if(dadosLinha.length > 0) conteudoCSV += dadosLinha.join(";") + "\r\n"; 
    });

    const blob = new Blob([conteudoCSV], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", nomeArquivo + ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function configurarPlanilhasEditaveis() {
    document.querySelectorAll('table').forEach(tabela => {
        tabela.addEventListener('blur', (evento) => {
            const celula = evento.target;
            if (celula.tagName === 'TD' && celula.hasAttribute('contenteditable')) {
                const linha = celula.parentElement;
                const id = linha.getAttribute('data-id');
                const cat = linha.getAttribute('data-cat');
                const sub = linha.getAttribute('data-sub');
                const colunaIndex = celula.cellIndex;
                const novoValor = celula.innerText.trim();

                // Tratamento específico para as novas tabelas de materiais/ferramentas editáveis na hora
                if (cat && sub && id) {
                    const item = DB_INVENTARIO[cat][sub].find(i => i.id == id);
                    if (item) {
                        if (colunaIndex === 0) item.nome = novoValor;
                        if (colunaIndex === 1) item.quantidade = parseInt(novoValor) || 0;
                        if (colunaIndex === 2) item.unidade = novoValor;
                        salvarBD();
                    }
                    return;
                }

                // Tratamento antigo de funcionários
                if (id) {
                    const func = DB_FUNCIONARIOS.find(f => f.id == id);
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

function lidarBotaoLogin() {
    const btn = document.getElementById('btn-estado-login');
    const sidebar = document.getElementById('sidebar-admin');

    if (!isAdminLogado) {
        let senha = prompt("Digite a senha do Administrador:");
        if (senha && senha.toLowerCase().trim() === "admin") {
            isAdminLogado = true;
            btn.innerHTML = '<i class="fa-solid fa-unlock"></i> SAIR';
            btn.style.backgroundColor = '#22c55e';
            sidebar.style.display = 'flex'; 
            switchTab('painel-geral'); 
        } else { 
            alert("Acesso negado!"); 
        }
    } else {
        isAdminLogado = false;
        btn.innerHTML = '<i class="fa-solid fa-lock"></i> ADMIN';
        btn.style.backgroundColor = '';
        sidebar.style.display = 'none'; 
        switchTab('aba-ponto-funcionarios'); 
    }
}

function atualizarSelects() {
    const selectProdFunc = document.getElementById('prod-funcionario');
    const selectAddFuncObra = document.getElementById('func-obra-inicial');
    const selectFiltroObra = document.getElementById('filtro-obra-analise');

    if (selectProdFunc) selectProdFunc.innerHTML = '<option value="">-- Escolha o Operário --</option>' + DB_FUNCIONARIOS.map(f => `<option value="${f.nome}">${f.nome}</option>`).join('');
    if (selectAddFuncObra) selectAddFuncObra.innerHTML = DB_OBRAS.map(o => `<option value="${o.id}">${o.nome}</option>`).join('');
    if (selectFiltroObra) selectFiltroObra.innerHTML = '<option value="">-- Escolha a Obra para Filtrar --</option>' + DB_OBRAS.map(o => `<option value="${o.id}">${o.nome}</option>`).join('');
}

function solicitarPontoPublico() {
    const nomeSelecionado = localStorage.getItem('cc_nome_proprio_dispositivo');
    if (!nomeSelecionado) { alert("Nome do dispositivo não configurado."); return; }

    document.getElementById('modal-ponto').style.display = 'flex';
    document.getElementById('modal-ponto-titulo').innerText = `Registrar Horário: ${nomeSelecionado}`;

    const video = document.getElementById('ponto-video');
    const gpsStatus = document.getElementById('modal-ponto-gps');
    gpsStatus.innerHTML = `📡 Buscando satélites GPS e iniciando câmera...`;
    
    enderecoCompletoGlobal = "Buscando localização detalhada...";

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
        .then(stream => { streamCameraGlobal = stream; video.srcObject = stream; })
        .catch(() => alert("Erro ao acessar a câmera frontal."));

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            gpsStatus.innerHTML = `📍 Localização encontrada. Consultando CEP...`;

            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`, {
                headers: { 'User-Agent': 'ControleBS/3.6' }
            })
            .then(res => res.json())
            .then(dados => {
                const add = dados.address || {};
                const rua = add.road || add.pedestrian || "Rua não identificada";
                const bairro = add.suburb || add.neighbourhood || "Bairro não mapeado";
                const cep = add.postcode || "CEP indisponível";
                const cidade = add.city || add.town || "";

                enderecoCompletoGlobal = `RUA: ${rua}\nBAIRRO: ${bairro} | CEP: ${cep}\nCIDADE: ${cidade} (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
                gpsStatus.innerHTML = `📍 Mapeado: ${rua}, ${bairro} - CEP: ${cep}`;
            })
            .catch(() => {
                enderecoCompletoGlobal = `Lat: ${lat.toFixed(5)} | Lon: ${lon.toFixed(5)}\n(Sem rede para reverter CEP)`;
                gpsStatus.innerHTML = `📍 Travado por Coordenadas: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
            });

        }, () => { 
            enderecoCompletoGlobal = "GPS Indisponível (Ponto batido sem rastreamento de satélite)";
            gpsStatus.innerHTML = "❌ Sinal de GPS indisponível."; 
        }, { enableHighAccuracy: true, timeout: 10000 });
    }
}

function fecharModalPonto() {
    document.getElementById('modal-ponto').style.display = 'none';
    if (streamCameraGlobal) streamCameraGlobal.getTracks().forEach(track => track.stop());
}

function confirmarPontoPublico() {
    const nome = localStorage.getItem('cc_nome_proprio_dispositivo');
    const video = document.getElementById('ponto-video');
    
    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, 640, 480);

    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(15, 330, 610, 135);
    ctx.fillStyle = "#f39c12"; 
    ctx.fillRect(15, 330, 6, 135);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px 'Segoe UI', Arial, sans-serif";
    
    const agora = new Date();
    const dataHoraStr = agora.toLocaleString('pt-BR');
    ctx.fillText(`OPERÁRIO: ${nome.toUpperCase()}`, 35, 360);
    
    ctx.fillStyle = "#f39c12";
    ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
    ctx.fillText(`📅 ${dataHoraStr}`, 35, 385);

    ctx.fillStyle = "#e0e0e5";
    ctx.font = "600 12px 'Segoe UI', Arial, sans-serif";
    
    const linhasEndereco = enderecoCompletoGlobal.split('\n');
    let alturaLinha = 410;
    linhasEndereco.forEach(linha => {
        ctx.fillText(linha, 35, alturaLinha);
        alturaLinha += 20;
    });

    const fotoFinalComCarimbo = canvas.toDataURL('image/jpeg');
    const funcionario = DB_FUNCIONARIOS.find(f => f.nome.toLowerCase().trim() === nome.toLowerCase().trim());
    
    if (funcionario) {
        funcionario.fotoRecente = fotoFinalComCarimbo;
        funcionario.frequencia += 1;
        funcionario.ultimaProd = `Batida às ${agora.toLocaleTimeString('pt-BR')}`;
        
        DB_PRODUCAO.push({
            funcionario: funcionario.nome,
            volume: `Batida de Horário (${agora.toLocaleTimeString('pt-BR')})`,
            data: dataHoraStr,
            obraId: funcionario.obraId,
            fotoCartao: fotoFinalComCarimbo
        });
        salvarBD(); renderizarPainelGeral(); renderizarFichasEfetivo(); renderizarProducaoPorObra();
        alert(`Ponto das ${agora.toLocaleTimeString('pt-BR')} armazenado com sucesso!`);
    } else {
        DB_PRODUCAO.push({ funcionario: nome + " (Não cadastrado)", volume: `Ponto Contingência às ${agora.toLocaleTimeString('pt-BR')}`, data: dataHoraStr, obraId: 0, fotoCartao: fotoFinalComCarimbo });
        salvarBD(); renderizarPainelGeral();
        alert(`Aviso: Horário salvo (${agora.toLocaleTimeString('pt-BR')}), mas seu nome não foi localizado na lista oficial do Administrador.`);
    }
    fecharModalPonto();
}

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
                <td><span class="badge-obra">${obraObj ? obraObj.nome : "Não Alocado"}</span></td>
                <td contenteditable="true" style="color: var(--neon-green); font-weight:bold;">${f.frequencia}</td>
                <td><span style="color: var(--accent-orange); font-size:13px;">${f.ultimaProd}</span></td>
            </tr>
        `;
    }).join('');
}

function renderizarFichasEfetivo() {
    const tbody = document.getElementById('tbody-fichas');
    if (!tbody) return;

    tbody.innerHTML = DB_FUNCIONARIOS.map(f => `
        <tr class="row-clicavel" data-id="${f.id}" onclick="abrirFichaOperario(${f.id})">
            <td><i class="fa-solid fa-id-badge" style="color:var(--accent-orange); margin-right:8px;"></i> <strong>${f.nome}</strong></td>
            <td>${f.cargo}</td>
            <td>${f.frequencia} batidas</td>
            <td><span style="color:var(--neon-blue); font-size:13px;">Inspecionar Histórico &rarr;</span></td>
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
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Nenhum canteiro selecionado para filtragem.</td></tr>`;
        return;
    }

    const obraSelecionada = DB_OBRAS.find(o => o.id == idObraFiltrada);
    titulo.innerText = `Frente de Trabalho: ${obraSelecionada ? obraSelecionada.nome : ''}`;
    const operariosFiltrados = DB_FUNCIONARIOS.filter(f => f.obraId == idObraFiltrada);

    tbody.innerHTML = operariosFiltrados.map(f => `
        <tr data-id="${f.id}">
            <td><strong>${f.nome}</strong></td>
            <td>${f.cargo}</td>
            <td>${f.frequencia} Batidas</td>
            <td>${f.ultimaProd}</td>
        </tr>
    `).join('');
}

function abrirFichaOperario(id) {
    const func = DB_FUNCIONARIOS.find(f => f.id == id);
    if (!func) return;

    const obraObj = DB_OBRAS.find(o => o.id == func.obraId);
    const todasBatidas = DB_PRODUCAO.filter(p => p.funcionario.toLowerCase().trim() === func.nome.toLowerCase().trim());

    document.getElementById('ficha-nome-titulo').innerText = `Ficha Cadastral: ${func.nome}`;
    const imgElement = document.getElementById('ficha-foto-img');
    const txtSemFoto = document.getElementById('ficha-sem-foto-txt');

    if (func.fotoRecente) {
        imgElement.src = func.fotoRecente; imgElement.style.display = 'block'; txtSemFoto.style.display = 'none';
    } else {
        imgElement.style.display = 'none'; txtSemFoto.style.display = 'block';
    }

    document.getElementById('ficha-dados-texto').innerHTML = `
        <p><strong>Profissão/Cargo:</strong> ${func.cargo}</p>
        <p><strong>Canteiro Alocado:</strong> ${obraObj ? obraObj.nome : 'Nenhum'}</p>
        <p><strong>Endereço da Obra:</strong> ${obraObj ? obraObj.local : '-'}</p>
        <p><strong>Total de Registros:</strong> ${func.frequencia} pontos batidos</p>
    `;

    const historicoBox = document.getElementById('ficha-historico-lista');
    if (todasBatidas.length === 0) {
        historicoBox.innerHTML = `<div style="color:var(--text-muted); font-size:12px; padding:5px;">Nenhum horário salvo.</div>`;
    } else {
        historicoBox.innerHTML = [...todasBatidas].reverse().map(b => `
            <div class="historico-item" style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between;">
                <span><i class="fa-regular fa-clock" style="color:var(--accent-orange); margin-right:5px;"></i> ${b.volume}</span>
                <span style="color:var(--text-muted); font-size:11px;">${b.data.split(' ')[0]}</span>
            </div>
        `).join('');
    }
    document.getElementById('modal-ficha').style.display = 'flex';
}

function fecharModalFicha() {
    document.getElementById('modal-ficha').style.display = 'none';
}

document.getElementById('form-producao')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nomeFunc = document.getElementById('prod-funcionario').value;
    const volumeProd = document.getElementById('prod-quantidade').value;
    const funcionario = DB_FUNCIONARIOS.find(f => f.nome === nomeFunc);
    if (funcionario) {
        funcionario.ultimaProd = volumeProd;
        DB_PRODUCAO.push({ funcionario: nomeFunc, volume: `Produção: ${volumeProd}`, data: new Date().toLocaleString('pt-BR'), obraId: funcionario.obraId });
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
    
    DB_FUNCIONARIOS.push({ id: novoId, nome, cargo, obraId, frequencia: 0, ultimaProd: "-", fotoRecente: "" });
    salvarBD(); atualizarSelects(); renderizarPainelGeral(); renderizarFichasEfetivo();
    e.target.reset(); alert(`Operário cadastrado pelo admin!`);
});

document.getElementById('form-add-obra')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('obra-nome').value;
    const local = document.getElementById('obra-local').value;
    const novoId = DB_OBRAS.length ? Math.max(...DB_OBRAS.map(o => o.id)) + 1 : 1;
    
    DB_OBRAS.push({ id: novoId, nome, local });
    salvarBD(); atualizarSelects(); renderizarPainelGeral();
    e.target.reset(); alert(`Canteiro integrado!`);
});

function carregarProjetoPlanta(event) {
    const arquivo = event.target.files[0];
    const status = document.getElementById('preview-projeto-status');
    const iframeViewer = document.getElementById('viewer-pdf-projeto');
    const imgViewer = document.getElementById('viewer-img-projeto');

    if (!arquivo) return;
    iframeViewer.style.display = 'none'; imgViewer.style.display = 'none'; status.style.display = 'none';
    const urlArquivo = URL.createObjectURL(arquivo);

    if (arquivo.type === "application/pdf") {
        iframeViewer.src = urlArquivo; iframeViewer.style.display = 'block';
    } else if (arquivo.type.startsWith("image/")) {
        imgViewer.src = urlArquivo; imgViewer.style.display = 'block';```javascript

