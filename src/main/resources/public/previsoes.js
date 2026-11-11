/* Página "Previsões e prevenção": cenários por mês, prioridade por município e plano de contenção. */

"use strict";

const MES_NOME = { jan: "janeiro", fev: "fevereiro", mar: "março", abr: "abril", mai: "maio", jun: "junho",
    jul: "julho", ago: "agosto", set: "setembro", out: "outubro", nov: "novembro", dez: "dezembro" };
const MES_ABREV = Object.keys(MES_NOME);
const CELULA = 0.1; // mesma grade do PrevisaoService (graus)
const fmtIndice = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const FAIXA = {
    alta: { texto: "Alta", cor: () => cor("--prio-alta") },
    media: { texto: "Média", cor: () => cor("--prio-media") },
    baixa: { texto: "Baixa", cor: () => cor("--prio-baixa") },
};

const estado = { dados: null, selecionado: null, mapa: null, camadas: null, marcadores: new Map() };

// --------------------------------------------------------------------------
// Resumo
// --------------------------------------------------------------------------

function mostrarResumo() {
    const d = estado.dados;
    const j = d.janelaCritica;
    const pico = d.sazonalidade.reduce((m, x) => (x.participacao > m.participacao ? x : m));
    const v = d.validacao;

    $("kJanela").textContent = `${j.inicio}–${j.fim}`;
    $("kJanelaSub").textContent = `${fmtDec.format(j.participacao)}% dos focos de um ano típico`;
    $("kPico").textContent = pico.mes;
    $("kPicoSub").textContent = `${fmtDec.format(pico.participacao)}% do ano; cerca de ${fmtInt.format(pico.cenarioCentral)} focos no cenário médio`;
    $("kAlta").textContent = fmtInt.format(d.resumo.alta);
    $("kAltaSub").textContent = `de ${fmtInt.format(d.resumo.municipios)}; somam ${porcentagem(d.resumo.focosAlta, d.resumo.focosTotal)} dos focos`;
    if (v) {
        $("kRepete").textContent = `${fmtDec.format(v.percentualEmMunicipiosDaBase)}%`;
        $("kRepeteSub").textContent = `${fmtInt.format(v.focosTesteEmMunicipiosDaBase)} de ${fmtInt.format(v.focosTeste)} focos`;
    }
}

// --------------------------------------------------------------------------
// Quando: cenários e calendário
// --------------------------------------------------------------------------

function mostrarCenarios() {
    const d = estado.dados;
    const s = d.sazonalidade;
    const [a1, a2] = d.anos;
    const corFaixa = cor("--prio-media");

    $("legendaQuando").innerHTML =
        `<span class="chip" style="--cor:${corFaixa}">faixa entre cenários</span>` +
        `<span class="chip chip--linha" style="--cor:${cor("--texto")}">cenário médio</span>` +
        `<span class="chip chip--linha" style="--cor:${cor("--serie-1")}">${a1}</span>` +
        `<span class="chip chip--linha" style="--cor:${cor("--serie-2")}">${a2}</span>`;

    desenhar("gCenarios", {
        data: {
            labels: s.map((m) => m.mes),
            datasets: [
                {
                    type: "line", label: "Cenário médio", data: s.map((m) => m.cenarioCentral),
                    borderColor: cor("--texto"), backgroundColor: cor("--texto"), borderWidth: 2,
                    pointRadius: 3, tension: 0.25, order: 0,
                },
                {
                    type: "line", label: String(a1), data: s.map((m) => m.focosPorAno[0]),
                    borderColor: cor("--serie-1"), borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, order: 1,
                },
                {
                    type: "line", label: String(a2), data: s.map((m) => m.focosPorAno[1]),
                    borderColor: cor("--serie-2"), borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, order: 2,
                },
                {
                    type: "bar", label: "Faixa", data: s.map((m) => [m.cenarioBaixo, m.cenarioAlto]),
                    backgroundColor: corFaixa + "66", borderColor: corFaixa, borderWidth: 1, borderSkipped: false,
                    borderRadius: 3, maxBarThickness: 34, order: 3,
                },
            ],
        },
        options: {
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (itens) => MES_NOME[itens[0].label],
                        label: (c) => c.dataset.label === "Faixa"
                            ? ` Faixa: ${fmtInt.format(c.raw[0])} a ${fmtInt.format(c.raw[1])} focos`
                            : ` ${c.dataset.label}: ${fmtInt.format(c.raw)}`,
                        footer: (itens) => `${fmtDec.format(s[itens[0].dataIndex].participacao)}% de um ano típico`,
                    },
                },
            },
            scales: { x: eixoCategoria(), y: eixoValor() },
        },
    });

    const total = (i) => s.reduce((t, m) => t + m.focosPorAno[i], 0);
    const baixo = s.reduce((t, m) => t + m.cenarioBaixo, 0);
    const alto = s.reduce((t, m) => t + m.cenarioAlto, 0);
    $("notaQuando").textContent =
        `Os cenários distribuem pelo perfil do ano um total igual ao de ${a1} (${fmtInt.format(total(0))} focos, ` +
        `cenário baixo), à média dos dois anos e ao de ${a2} (${fmtInt.format(total(1))}, cenário alto). ` +
        `O formato se repetiu nos dois anos, com pico em agosto e setembro; o que mudou muito foi a intensidade, ` +
        `por isso a faixa vai de ${fmtInt.format(baixo)} a ${fmtInt.format(alto)} focos no ano.`;
}

/** Fases do calendário a partir da janela crítica (meses de 1 a 12). */
function fasesDoAno(janela) {
    const fase = new Array(12).fill("rotina");
    const marcar = (mes, nome) => { fase[(mes + 11) % 12] = nome; };
    for (let m = janela.mesInicio; m <= janela.mesFim; m++) marcar(m, "resposta");
    marcar(janela.mesInicio - 1, "preparacao");
    marcar(janela.mesInicio - 2, "preparacao");
    marcar(janela.mesFim + 1, "recuperacao");
    return fase;
}

const FASES = {
    preparacao: {
        titulo: "Preparação",
        itens: ["Abrir e limpar aceiros nas áreas que tiveram foco nos dois anos",
            "Roçar capim e retirar palha seca perto de cercas, estradas e casas",
            "Treinar brigadas e conferir equipamentos e caminhões-pipa",
            "Campanha contra queimadas com produtores rurais e moradores"],
    },
    resposta: {
        titulo: "Janela crítica",
        itens: ["Brigadas de prontidão nos municípios de prioridade alta",
            "Acompanhar os focos do INPE todos os dias e mandar equipe logo após a detecção",
            "Reforço extra nos meses de pico",
            "Proibir e fiscalizar o uso de fogo em áreas rurais"],
    },
    recuperacao: {
        titulo: "Recuperação",
        itens: ["Levantar as áreas atingidas e comparar com o ranking",
            "Recuperar aceiros e cercas danificados",
            "Atualizar a lista de prioridades com os dados do ano"],
    },
    rotina: {
        titulo: "Rotina",
        itens: ["Manutenção dos aceiros e da vegetação nas bordas",
            "Planejamento e orçamento das ações do próximo ano"],
    },
};

function mostrarCalendario() {
    const d = estado.dados;
    const fases = fasesDoAno(d.janelaCritica);
    const max = Math.max(...d.sazonalidade.map((m) => m.participacao));
    $("calendario").innerHTML = d.sazonalidade.map((m, i) => `
        <li class="calendario__mes calendario__mes--${fases[i]}" title="${MES_NOME[m.mes]}: ${fmtDec.format(m.participacao)}% dos focos">
            <span class="calendario__barra" style="--altura:${Math.max(4, (m.participacao / max) * 100)}%"></span>
            <span class="calendario__rotulo">${m.mes}</span>
        </li>`).join("");

    const ordem = ["preparacao", "resposta", "recuperacao", "rotina"];
    $("fases").innerHTML = ordem.map((chave) => {
        const meses = MES_ABREV.filter((_, i) => fases[i] === chave);
        const periodo = meses.length > 1 ? `${meses[0]}–${meses[meses.length - 1]}` : (meses[0] ?? "");
        const f = FASES[chave];
        return `<div class="fase fase--${chave}">
            <h3>${f.titulo} <span class="nota">${chave === "rotina" ? "demais meses" : periodo}</span></h3>
            <ul>${f.itens.map((i) => `<li>${i}</li>`).join("")}</ul>
        </div>`;
    }).join("");
}

// --------------------------------------------------------------------------
// Onde: mapa, ranking e plano
// --------------------------------------------------------------------------

function raio(total) {
    return 1.5 + 0.85 * Math.sqrt(total);
}

function mostrarMapa() {
    const d = estado.dados;
    $("legendaMapa").innerHTML = ["alta", "media", "baixa"]
        .map((f) => `<span class="chip" style="--cor:${FAIXA[f].cor()}">${FAIXA[f].texto}</span>`).join("") +
        `<span class="chip chip--quadrado" style="--cor:${cor("--texto")}">área recorrente</span>`;

    if (typeof window.L === "undefined") {
        $("mapa").innerHTML = '<div class="vazio">O mapa precisa de internet para carregar (Leaflet).</div>';
        return;
    }
    if (!estado.mapa) {
        estado.mapa = L.map("mapa", { preferCanvas: true }).setView([-22.3, -48.6], 7);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 18,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(estado.mapa);
    }
    estado.camadas?.remove();
    estado.marcadores.clear();

    const superficie = cor("--superficie");
    const camadas = [];
    // baixa primeiro, alta por cima
    for (const faixa of ["baixa", "media", "alta"]) {
        for (const m of d.todosMunicipios.filter((x) => x.prioridade === faixa)) {
            const c = L.circleMarker([m.latitude, m.longitude], {
                radius: raio(m.total),
                weight: 1,
                color: superficie,
                fillColor: FAIXA[faixa].cor(),
                fillOpacity: faixa === "baixa" ? 0.55 : 0.85,
            }).bindTooltip(`<strong>${escapar(m.nome)}</strong><br>${fmtInt.format(m.total)} focos · prioridade ${FAIXA[faixa].texto.toLowerCase()}`);
            c.on("click", () => selecionar(m.nome, false));
            estado.marcadores.set(m.nome, c);
            camadas.push(c);
        }
    }
    for (const a of d.areasRecorrentes) {
        const lat0 = Math.floor(a.latitude / CELULA) * CELULA;
        const lon0 = Math.floor(a.longitude / CELULA) * CELULA;
        camadas.push(L.rectangle([[lat0, lon0], [lat0 + CELULA, lon0 + CELULA]], {
            color: cor("--texto"), weight: 1.5, fill: false, dashArray: "3 3",
        }).bindTooltip(`Área recorrente perto de <strong>${escapar(a.nome)}</strong><br>` +
            `${fmtInt.format(a.total)} focos em ${fmtInt.format(a.diasComFoco)} dias, nos dois anos`));
    }
    estado.camadas = L.featureGroup(camadas).addTo(estado.mapa);
    estado.mapa.fitBounds(estado.camadas.getBounds(), { padding: [12, 12] });
}

function mostrarRanking() {
    const d = estado.dados;
    const top = Number($("top").value);
    const linhas = d.todosMunicipios.slice(0, top);
    $("thAno1").textContent = d.anos[0];
    $("thAno2").textContent = d.anos[1];
    $("corpoRanking").innerHTML = linhas.map((m) => `
        <tr data-municipio="${escapar(m.nome)}"${m.nome === estado.selecionado ? ' class="selecionada"' : ""} tabindex="0">
            <td class="num">${m.posicao}</td>
            <td>${escapar(m.nome)}</td>
            <td class="num">${fmtInt.format(m.focosPorAno[0])}</td>
            <td class="num">${fmtInt.format(m.focosPorAno[1])}</td>
            <td class="num">${fmtInt.format(m.diasComFoco)}</td>
            <td>${m.mesPico}</td>
            <td>${escapar(m.bioma)}</td>
            <td class="num">${fmtIndice.format(m.indice)}</td>
            <td><span class="chip" style="--cor:${FAIXA[m.prioridade].cor()}">${FAIXA[m.prioridade].texto}</span></td>
        </tr>`).join("");

    $("notaRanking").textContent =
        `Índice de 0 a 100 = 50% focos + 30% dias com foco (cada um em relação ao maior valor) + 20% se teve foco ` +
        `nos dois anos. Prioridade alta: os ${d.resumo.alta} primeiros (5% dos municípios); média: os ` +
        `${d.resumo.media} seguintes. Clique em uma linha para ver o plano.`;
}

function variacao(m) {
    const [a, b] = m.focosPorAno;
    if (a === 0) return "apareceu só no último ano";
    const r = b / a;
    if (r >= 1.5) return `cresceu ${vezes(b, a)}`;
    if (r <= 0.67) return `caiu para ${porcentagem(b, a)} do ano anterior`;
    return "ficou estável";
}

/** Recomendações montadas a partir dos números do município. */
function recomendacoes(m) {
    const d = estado.dados;
    const i = MES_ABREV.indexOf(m.mesPico);
    const antes = MES_ABREV[(i + 10) % 12];
    const depois = MES_ABREV[(i + 1) % 12];
    const areas = d.areasRecorrentes.filter((a) => a.nome === m.nome).length;
    const lista = [];

    lista.push(`<strong>Prontidão de ${MES_ABREV[(i + 11) % 12]} a ${depois}.</strong> O pico aqui foi em ${MES_NOME[m.mesPico]}; ` +
        `aceiros e limpeza de material seco precisam estar prontos até ${MES_NOME[antes]}.`);
    if (m.recorrente) {
        lista.push(`<strong>Área de ação permanente.</strong> Teve foco nos dois anos, então não é um caso isolado: ` +
            `vale manter aceiros fixos e vistoria mensal, não só uma operação na época seca.`);
    }
    if (areas > 0) {
        lista.push(`<strong>${areas} ${areas === 1 ? "área recorrente" : "áreas recorrentes"} no mapa.</strong> ` +
            `São os quadrados de cerca de 11 km com foco nos dois anos; é ali que a brigada deve ficar posicionada.`);
    }
    const focosPorDia = m.total / m.diasComFoco;
    if (focosPorDia >= 3) {
        lista.push(`<strong>Focos concentrados.</strong> Foram ${fmtInt.format(m.total)} focos em só ` +
            `${fmtInt.format(m.diasComFoco)} dias, sinal de incêndios grandes que se espalham. ` +
            `A prioridade é chegar rápido no começo e ter apoio de municípios vizinhos.`);
    } else {
        lista.push(`<strong>Focos espalhados no tempo.</strong> Foram ${fmtInt.format(m.total)} focos em ` +
            `${fmtInt.format(m.diasComFoco)} dias diferentes, ao longo de ${m.mesesAtivos} meses. ` +
            `Aqui o monitoramento diário rende mais do que uma operação concentrada.`);
    }
    const [a, b] = m.focosPorAno;
    if (a > 0 && b / a >= 3) {
        lista.push(`<strong>Crescimento forte.</strong> Os focos passaram de ${fmtInt.format(a)} para ` +
            `${fmtInt.format(b)}. Vale entender o que mudou no uso da terra e reforçar a fiscalização do uso de fogo.`);
    }
    if (m.bioma === "Cerrado") {
        lista.push(`<strong>Cerrado.</strong> Capim e pasto secam rápido no inverno; o manejo dessa vegetação ` +
            `nas bordas de estradas e propriedades reduz o combustível disponível.`);
    } else if (m.bioma === "Mata Atlântica") {
        lista.push(`<strong>Mata Atlântica.</strong> Os fragmentos de mata costumam ser atingidos pelo fogo que ` +
            `vem de pastos e plantações vizinhos; proteger as bordas com aceiros é a medida principal.`);
    }
    return lista;
}

function mostrarPlano() {
    const m = estado.dados.todosMunicipios.find((x) => x.nome === estado.selecionado);
    if (!m) return;
    const faixa = FAIXA[m.prioridade];
    $("faixaPlano").innerHTML = `<span class="chip" style="--cor:${faixa.cor()}">Prioridade ${faixa.texto.toLowerCase()}</span>`;
    const [a1, a2] = estado.dados.anos;
    $("plano").innerHTML = `
        <h3 class="plano__nome">${escapar(m.nome)}</h3>
        <p class="nota">${m.posicao}º de ${fmtInt.format(estado.dados.resumo.municipios)} no índice
            (${fmtIndice.format(m.indice)}) · ${escapar(m.bioma)}</p>
        <dl class="plano__numeros">
            <div><dt>${a1}</dt><dd>${fmtInt.format(m.focosPorAno[0])}</dd></div>
            <div><dt>${a2}</dt><dd>${fmtInt.format(m.focosPorAno[1])}</dd></div>
            <div><dt>Dias com foco</dt><dd>${fmtInt.format(m.diasComFoco)}</dd></div>
            <div><dt>Pico</dt><dd>${m.mesPico}</dd></div>
        </dl>
        <p class="plano__variacao">De ${a1} para ${a2}, o número de focos ${variacao(m)}.</p>
        <ul class="plano__acoes">${recomendacoes(m).map((r) => `<li>${r}</li>`).join("")}</ul>`;
}

function selecionar(nome, moverMapa = true) {
    estado.selecionado = nome;
    mostrarPlano();
    document.querySelectorAll("#corpoRanking tr").forEach((tr) =>
        tr.classList.toggle("selecionada", tr.dataset.municipio === nome));
    const marcador = estado.marcadores.get(nome);
    if (marcador && estado.mapa) {
        if (moverMapa) estado.mapa.flyTo(marcador.getLatLng(), 10, { duration: 0.8 });
        marcador.openTooltip();
    }
}

// --------------------------------------------------------------------------
// Validação retroativa
// --------------------------------------------------------------------------

function mostrarValidacao() {
    const v = estado.dados.validacao;
    if (!v) {
        $("textoValidacao").innerHTML = "<p>É preciso ter pelo menos dois anos de dados para a validação.</p>";
        return;
    }
    const c10 = v.coberturas.find((c) => c.k === 58) ?? v.coberturas[0];
    $("textoValidacao").innerHTML = `
        <p>Para saber se priorizar pelos lugares que já queimaram faz sentido, fizemos um teste simples:
        calculamos o ranking só com os dados de <strong>${v.anoBase}</strong>, como se ainda não conhecêssemos
        ${v.anoTeste}, e depois contamos quantos focos de ${v.anoTeste} caíram nos municípios escolhidos.</p>
        <p>Com os ${c10.k} primeiros do ranking (${fmtDec.format(c10.percentualMunicipios)}% dos municípios), a
        prevenção teria alcançado <strong>${fmtDec.format(c10.percentual)}%</strong> dos focos de ${v.anoTeste}.
        Escolhendo os municípios por sorteio, a expectativa seria de ${fmtDec.format(c10.aleatorio)}%. Se
        soubéssemos o futuro, o máximo possível seria ${fmtDec.format(c10.ideal)}%.</p>
        <p>Ou seja: o histórico ajuda (cerca de ${vezes(c10.percentual, c10.aleatorio)} melhor que o acaso), mas
        está longe de acertar tudo. Em ${v.anoTeste} o fogo apareceu em muitos lugares novos, então a lista de
        prioridades precisa ser revista todo ano e o monitoramento diário continua necessário.</p>`;

    const cores = { sorteio: cor("--prio-baixa"), ranking: cor("--prio-alta"), ideal: cor("--linha") };
    $("legendaValidacao").innerHTML =
        `<span class="chip" style="--cor:${cores.sorteio}">sorteio</span>` +
        `<span class="chip" style="--cor:${cores.ranking}">ranking de ${v.anoBase}</span>` +
        `<span class="chip" style="--cor:${cores.ideal}">ideal</span>`;
    desenhar("gValidacao", {
        type: "bar",
        data: {
            labels: v.coberturas.map((c) => `${c.k} municípios`),
            datasets: [
                { label: "Sorteio", data: v.coberturas.map((c) => c.aleatorio), backgroundColor: cores.sorteio, ...barra },
                { label: `Ranking de ${v.anoBase}`, data: v.coberturas.map((c) => c.percentual), backgroundColor: cores.ranking, ...barra },
                { label: `Ideal (sabendo ${v.anoTeste})`, data: v.coberturas.map((c) => c.ideal), backgroundColor: cores.ideal, ...barra },
            ],
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${fmtDec.format(c.raw)}% dos focos de ${v.anoTeste}` } },
            },
            scales: {
                x: eixoCategoria(),
                y: { ...eixoValor(), max: 100, ticks: { callback: (x) => `${x}%` } },
            },
        },
    });
}

// --------------------------------------------------------------------------

function mostrarTudo() {
    mostrarResumo();
    mostrarCenarios();
    mostrarCalendario();
    mostrarMapa();
    mostrarRanking();
    mostrarPlano();
    mostrarValidacao();
    const o = estado.dados.ordenacao;
    $("notaOrdenacao").textContent =
        `Os rankings desta página (municípios e áreas da grade) foram ordenados com o ${o.algoritmo} do projeto: ` +
        `${fmtInt.format(o.comparacoes)} comparações e ${fmtInt.format(o.trocas)} movimentações.`;
}

async function iniciar() {
    $("top").addEventListener("change", mostrarRanking);
    const aoEscolherLinha = (ev) => {
        const tr = ev.target.closest("tr[data-municipio]");
        if (tr && (ev.type === "click" || ev.key === "Enter")) selecionar(tr.dataset.municipio);
    };
    $("corpoRanking").addEventListener("click", aoEscolherLinha);
    $("corpoRanking").addEventListener("keydown", aoEscolherLinha);
    aoTrocarTema(mostrarTudo);

    try {
        const [, dados] = await Promise.all([verificarApi(), api("/api/previsoes", { top: 30 })]);
        estado.dados = dados;
        estado.selecionado = dados.todosMunicipios[0]?.nome ?? null;
        mostrarTudo();
    } catch (e) {
        mostrarErro(e.message);
    }
}

document.addEventListener("DOMContentLoaded", iniciar);
