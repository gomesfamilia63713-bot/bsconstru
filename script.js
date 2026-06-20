// ==========================================================================
// CONSTRUCONTROL PRO v3.5 — ARMAZENAMENTO LOCAL DE USUÁRIO E REGISTRO LIVRE
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

function salvarBD() {
    localStorage.setItem('cc_funcionarios_v3', JSON.stringify(DB_FUNCIONARIOS));
    localStorage.setItem('cc_obras_v3', JSON.stringify(DB_OBRAS));
    localStorage.setItem('cc_producao_v3', JSON.stringify(DB_PRODUCAO));
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
    configurarPlanilhasEditaveis();
});

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

// Função modificada para ler qualquer imagem da galeria/armazenamento local
function carregarLogoArquivoAdmin(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        // Converte o arquivo local em String Base64 permanente
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
        const colunas = inline_obterColunas(linha);
        let dadosLinha = [];
        colunas.forEach(coluna => {
            let texto = coluna.innerText.replace(/"/g, '""').trim();
            if (texto.includes("Inspecionar Histórico")) texto = texto.replace("Inspecionar Histórico →", "").trim();
            dadosLinha.push('"' + texto + '"');
        });
        conteudoCSV += dadosLinha.join(";") + "\r\n"; 
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

function inline_obterColunas(linha) {
    return inline_obterColunasElement = linha.querySelectorAll("th, td");
}

function configuringPlanilhasEditaveisHelper(celula, tabela) {
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

function configurarPlanilhasEditaveis() {
    document.querySelectorAll('table').forEach(tabela => {
        tabela.addEventListener('blur', (evento) => {
            const celula = evento.target;
            if (celula.tagName === 'TD' && celula.hasAttribute('contenteditable')) {
                configuringPlanilhasEditaveisHelper(celula, tabela);
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
                headers: { 'User-Agent': 'ControleBS/3.5' }
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
    canvas.width = 640; 
    canvas.height = 480;
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
        DB_PRODUCAO.push({ funcionario: nomeFunc,
