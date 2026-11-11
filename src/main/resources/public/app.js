/* ==========================================================================
   Dashboard · Focos de Incêndio SP
   Chama a API Java (/api/...) e desenha métricas, tabela, mapa e gráficos.
   Nenhuma regra de negócio aqui: quem ordena é o back-end.
   ========================================================================== */

"use strict";

const TAMANHO_PAGINA = 25;
const CENTRO_SP = [-22.3, -48.6];

const fmtInt = new Intl.NumberFormat("pt-BR");
const fmtDec = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const fmtSeg = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtCompacto = new Intl.NumberFormat("pt-BR", { notation: "compact" });

/** Estado da tela. */
const estado = {
    opcoes: null,          // /api/opcoes
    resultado: null,       // última /api/ordenar
    pagina: 0,
    estatisticas: null,    // última /api/estatisticas
    comparativo: null,     // última /api/comparar
    medida: "comparacoes", // medida exibida no gráfico do comparativo
    ordemBiomas: [],       // biomas em ordem alfabética → define a cor de cada um
    graficos: {},          // instâncias do Chart.js
    mapa: null,
    camadaPontos: null,
    chaveMapa: null,       // evita redesenhar o mapa quando os pontos não mudaram
};

const $ = (id) => document.getElementById(id);

// --------------------------------------------------------------------------
// API
// --------------------------------------------------------------------------

/** GET na API. Em erro, lança Error com a mensagem que o back-end mandou em {"erro": ...}. */
async function api(caminho, parametros = {}) {
    const url = new URL(caminho, window.location.origin);
    for (const [k, v] of Object.entries(parametros)) {
        if (v !== null && v !== undefined && v !== "") url.searchParams.set(k, v);
    }
    let resposta;
    try {
        resposta = await fetch(url);
    } catch (e) {
        throw new Error("não foi possível falar com o servidor. O App.java está rodando?");
    }
    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
        throw new Error(corpo.erro || `erro HTTP ${resposta.status}`);
    }
    return corpo;
}

function mostrarErro(mensagem) {
    const aviso = $("aviso");
    aviso.innerHTML = `<strong>Erro:</strong> ${escapar(mensagem)}`;
    aviso.hidden = false;
}

function limparErro() {
    $("aviso").hidden = true;
}

function definirStatus(texto, tipo) {
    const s = $("status");
    s.textContent = texto;
    s.className = `status status--${tipo}`;
}

// --------------------------------------------------------------------------
// Utilidades
// --------------------------------------------------------------------------

function escapar(texto) {
    return String(texto).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
}

/** Lê uma cor definida no CSS (muda sozinha no modo escuro). */
function cor(variavel) {
    return getComputedStyle(document.documentElement).getPropertyValue(variavel).trim();
}

function corBioma(bioma) {
    const i = estado.ordemBiomas.indexOf(bioma);
    return i === 0 ? cor("--serie-1") : i === 1 ? cor("--serie-2") : cor("--neutro");
}

/** "2023-01-02T17:09:00" → "02/01/2023 17:09" */
function formatarData(iso) {
    const [data, hora] = iso.split("T");
    const [a, m, d] = data.split("-");
    return `${d}/${m}/${a} ${hora.slice(0, 5)}`;
}

function formatarTempo(ms) {
    return ms >= 1000 ? `${fmtSeg.format(ms / 1000)} s` : `${fmtDec.format(ms)} ms`;
}

function infoAlgoritmo(codigo) {
    return estado.opcoes.algoritmos.find((a) => a.codigo === codigo);
}

function ehQuadratico(codigo) {
    return infoAlgoritmo(codigo)?.complexidadeMedia === "O(n²)";
}

function bibliotecasCarregadas() {
    return typeof window.Chart !== "undefined" && typeof window.L !== "undefined";
}

function ocupado(sim) {
    $("btnOrdenar").disabled = sim;
    $("btnComparar").disabled = sim;
}

// --------------------------------------------------------------------------
// Controles
// --------------------------------------------------------------------------

function preencherControles(opcoes) {
    $("criterio").innerHTML = opcoes.criterios
        .map((c) => `<option value="${c.codigo}">${escapar(c.nome)}</option>`)
        .join("");

    $("algoritmo").innerHTML = opcoes.algoritmos
        .map((a) => `<option value="${a.codigo}">${escapar(a.nome)} · ${a.complexidadeMedia}</option>`)
        .join("");
    $("algoritmo").value = "MERGE";

    $("ano").innerHTML = `<option value="todos">Todos</option>` +
        opcoes.anos.map((a) => `<option value="${a}">${a}</option>`).join("");

    $("algoritmo").addEventListener("change", atualizarDica);
    atualizarDica();
}

function atualizarDica() {
    $("dicaQuadratico").hidden = !ehQuadratico($("algoritmo").value);
}

function parametrosAtuais() {
    return {
        criterio: $("criterio").value,
        algoritmo: $("algoritmo").value,
        ano: $("ano").value,
    };
}

// --------------------------------------------------------------------------
// Ordenação: métricas + tabela + mapa
// --------------------------------------------------------------------------

async function ordenar() {
    const p = parametrosAtuais();
    limparErro();
    ocupado(true);
    $("btnOrdenar").textContent = "Ordenando…";
    document.querySelector(".metricas").classList.add("carregando");

    try {
        const [resultado, estatisticas] = await Promise.all([
            api("/api/ordenar", p),
            api("/api/estatisticas", { ano: p.ano, top: 10 }),
        ]);
        estado.resultado = resultado;
        estado.pagina = 0;
        estado.estatisticas = estatisticas;

        mostrarMetricas(resultado);
        mostrarTabela();
        mostrarMapa();
        mostrarEstatisticas();
    } catch (e) {
        mostrarErro(e.message);
    } finally {
        ocupado(false);
        $("btnOrdenar").textContent = "Ordenar";
        document.querySelector(".metricas").classList.remove("carregando");
    }
}

function mostrarMetricas(r) {
    $("mComparacoes").textContent = fmtInt.format(r.comparacoes);
    $("mTrocas").textContent = fmtInt.format(r.trocas);
    $("mTempo").textContent = formatarTempo(r.tempoMs);
    $("mTotal").textContent = fmtInt.format(r.total);

    const info = estado.opcoes.algoritmos.find((a) => a.nome === r.algoritmo);
    const criterio = estado.opcoes.criterios.find((c) => c.codigo === r.criterio);
    const partes = [r.algoritmo, `por ${criterio ? criterio.nome.toLowerCase() : r.criterio}`];
    if (r.ano) partes.push(String(r.ano));
    if (info) partes.push(info.complexidadeMedia, info.estavel ? "estável" : "não estável");
    $("resumoAlgoritmo").textContent = partes.join(" · ");
}

function mostrarTabela() {
    const r = estado.resultado;
    if (!r) return;

    const totalPaginas = Math.max(1, Math.ceil(r.dados.length / TAMANHO_PAGINA));
    estado.pagina = Math.min(Math.max(0, estado.pagina), totalPaginas - 1);
    const inicio = estado.pagina * TAMANHO_PAGINA;
    const fatia = r.dados.slice(inicio, inicio + TAMANHO_PAGINA);

    // destaca a coluna do critério usado
    document.querySelectorAll("th[data-coluna]").forEach((th) =>
        th.classList.toggle("ordenado", th.dataset.coluna === r.criterio));
    const marca = (coluna) => (coluna === r.criterio ? ' class="ordenado"' : "");

    $("corpoTabela").innerHTML = fatia.map((f, i) => `
        <tr>
            <td class="num">${fmtInt.format(inicio + i + 1)}</td>
            <td${marca("DATA")}>${formatarData(f.dataHora)}</td>
            <td${marca("MUNICIPIO")}>${escapar(f.municipio)}</td>
            <td${marca("BIOMA")}><span class="chip" style="--cor:${corBioma(f.bioma)}">${escapar(f.bioma)}</span></td>
            <td class="num">${f.latitude.toFixed(4)}</td>
            <td class="num">${f.longitude.toFixed(4)}</td>
        </tr>`).join("");

    $("pagTexto").textContent = `Página ${fmtInt.format(estado.pagina + 1)} de ${fmtInt.format(totalPaginas)}`;
    $("infoPagina").textContent = r.dados.length
        ? `${fmtInt.format(inicio + 1)}–${fmtInt.format(inicio + fatia.length)} de ${fmtInt.format(r.dados.length)}`
        : "nenhum foco";
    $("pagPrimeira").disabled = $("pagAnterior").disabled = estado.pagina === 0;
    $("pagUltima").disabled = $("pagProxima").disabled = estado.pagina >= totalPaginas - 1;
}

function irParaPagina(pagina) {
    estado.pagina = pagina;
    mostrarTabela();
}

function mostrarMapa() {
    if (typeof window.L === "undefined") {
        $("mapa").innerHTML = '<div class="vazio">O mapa precisa de internet para carregar (Leaflet).</div>';
        return;
    }
    const r = estado.resultado;
    if (!estado.mapa) {
        estado.mapa = L.map("mapa", { preferCanvas: true }).setView(CENTRO_SP, 6);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 18,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(estado.mapa);
    }

    // os pontos só mudam quando muda o ano (a ordem não altera o mapa)
    const chave = `${r.ano ?? "todos"}:${r.total}`;
    if (chave !== estado.chaveMapa) {
        if (estado.camadaPontos) estado.camadaPontos.remove();
        const superficie = cor("--superficie");
        const pontos = r.dados.map((f) =>
            L.circleMarker([f.latitude, f.longitude], {
                radius: 4,
                weight: 1,
                color: superficie,          // anel da cor do fundo separa pontos sobrepostos
                fillColor: corBioma(f.bioma),
                fillOpacity: 0.85,
            }).bindPopup(() =>
                `<strong>${escapar(f.municipio)}</strong><br>${formatarData(f.dataHora)}<br>${escapar(f.bioma)}`));
        estado.camadaPontos = L.featureGroup(pontos).addTo(estado.mapa);
        estado.chaveMapa = chave;
        if (pontos.length) estado.mapa.fitBounds(estado.camadaPontos.getBounds(), { padding: [16, 16] });
    }

    $("legendaMapa").innerHTML = estado.ordemBiomas
        .map((b) => `<span class="chip" style="--cor:${corBioma(b)}">${escapar(b)}</span>`)
        .join("");
}

// --------------------------------------------------------------------------
// Gráficos (Chart.js)
// --------------------------------------------------------------------------

function configurarChart() {
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.size = 12;
    Chart.defaults.color = cor("--texto-2");
    Chart.defaults.borderColor = cor("--grade");
    Chart.defaults.plugins.tooltip.backgroundColor = cor("--texto");
    Chart.defaults.plugins.tooltip.titleColor = cor("--superficie");
    Chart.defaults.plugins.tooltip.bodyColor = cor("--superficie");
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.legend.labels.boxWidth = 10;
    Chart.defaults.plugins.legend.labels.boxHeight = 10;
    Chart.defaults.plugins.legend.labels.useBorderRadius = true;
    Chart.defaults.plugins.legend.labels.borderRadius = 5;
}

/** Cria (ou recria) um gráfico no canvas indicado. */
function desenhar(id, config) {
    if (typeof window.Chart === "undefined") return;
    estado.graficos[id]?.destroy();
    estado.graficos[id] = new Chart($(id), config);
}

const eixoValor = () => ({
    beginAtZero: true,
    grid: { color: cor("--grade") },
    border: { display: false },
    ticks: { callback: (v) => fmtInt.format(v) },
});
const eixoCategoria = () => ({
    grid: { display: false },
    border: { color: cor("--eixo") },
});
const barra = { borderRadius: 4, borderSkipped: "start", maxBarThickness: 28 };

function mostrarEstatisticas() {
    const e = estado.estatisticas;
    if (!e) return;

    const periodo = e.ano ? `em ${e.ano}` : "em 2023 e 2024";
    $("resumoEstatisticas").textContent =
        `${fmtInt.format(e.totalFocos)} focos ${periodo} · ${fmtInt.format(e.municipiosDistintos)} municípios`;

    // focos por mês, empilhado por bioma
    desenhar("gMes", {
        type: "bar",
        data: {
            labels: e.porMes.map((c) => c.rotulo),
            datasets: e.porMesPorBioma.map((s) => ({
                label: s.bioma,
                data: s.focos,
                backgroundColor: corBioma(s.bioma),
                borderColor: cor("--superficie"),
                borderWidth: { top: 2 },  // fresta entre os segmentos empilhados
                ...barra,
                borderSkipped: false,
                borderRadius: 2,
            })),
        },
        options: {
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { position: "top", align: "end" },
                tooltip: {
                    callbacks: {
                        label: (c) => ` ${c.dataset.label}: ${fmtInt.format(c.raw)}`,
                        footer: (itens) => `Total: ${fmtInt.format(itens.reduce((s, i) => s + i.raw, 0))}`,
                    },
                },
            },
            scales: { x: { ...eixoCategoria(), stacked: true }, y: { ...eixoValor(), stacked: true } },
        },
    });

    // por bioma
    desenhar("gBioma", {
        type: "bar",
        data: {
            labels: e.porBioma.map((c) => c.rotulo),
            datasets: [{
                data: e.porBioma.map((c) => c.focos),
                backgroundColor: e.porBioma.map((c) => corBioma(c.rotulo)),
                ...barra,
            }],
        },
        options: {
            indexAxis: "y",
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => ` ${fmtInt.format(c.raw)} focos (${porcentagem(c.raw, e.totalFocos)})` } },
            },
            scales: { x: eixoValor(), y: eixoCategoria() },
        },
    });

    // top municípios (magnitude sem identidade → cor neutra)
    desenhar("gMunicipios", {
        type: "bar",
        data: {
            labels: e.topMunicipios.map((c) => c.rotulo),
            datasets: [{ data: e.topMunicipios.map((c) => c.focos), backgroundColor: cor("--neutro"), ...barra }],
        },
        options: {
            indexAxis: "y",
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => ` ${fmtInt.format(c.raw)} focos` } },
            },
            scales: { x: eixoValor(), y: eixoCategoria() },
        },
    });
}

function porcentagem(parte, total) {
    return total ? `${fmtDec.format((parte / total) * 100)}%` : "–";
}

// --------------------------------------------------------------------------
// Comparativo dos 6 algoritmos
// --------------------------------------------------------------------------

async function comparar() {
    const p = parametrosAtuais();
    limparErro();
    ocupado(true);
    $("btnComparar").textContent = "Comparando… (pode levar ~15 s)";

    try {
        estado.comparativo = await api("/api/comparar", { criterio: p.criterio, ano: p.ano });
        $("secaoComparativo").hidden = false;
        mostrarComparativo();
        $("secaoComparativo").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
        mostrarErro(e.message);
    } finally {
        ocupado(false);
        $("btnComparar").textContent = "Comparar os 6 algoritmos";
    }
}

const NOMES_MEDIDA = { comparacoes: "Comparações", trocas: "Trocas / movimentações", tempoMs: "Tempo" };

function mostrarComparativo() {
    const c = estado.comparativo;
    if (!c) return;

    const criterio = estado.opcoes.criterios.find((x) => x.codigo === c.criterio);
    $("legendaComparativo").textContent =
        `Critério: ${criterio ? criterio.nome : c.criterio} · ${fmtInt.format(c.total)} focos` +
        `${c.ano ? ` de ${c.ano}` : ""} · mesma entrada para os seis · eixo em escala logarítmica (cada linha da grade = 10×)`;

    // tabela com os números exatos
    const maisRapido = Math.min(...c.algoritmos.map((a) => a.tempoMs));
    $("corpoComparativo").innerHTML = c.algoritmos.map((a) => `
        <tr${a.tempoMs === maisRapido ? ' class="melhor"' : ""}>
            <td>${escapar(a.nome)}</td>
            <td class="num">${fmtInt.format(a.comparacoes)}</td>
            <td class="num">${fmtInt.format(a.trocas)}</td>
            <td class="num">${formatarTempo(a.tempoMs)}</td>
            <td>${a.complexidadeMedia}</td>
            <td>${a.estavel ? "sim" : "não"}</td>
        </tr>`).join("");

    // gráfico: uma medida por vez (nunca dois eixos), cor = classe de complexidade
    const medida = estado.medida;
    const corClasse = (a) => (a.complexidadeMedia === "O(n²)" ? cor("--serie-3") : cor("--serie-7"));
    const classes = ["O(n²)", "O(n log n)"];

    desenhar("gComparativo", {
        type: "bar",
        data: {
            labels: c.algoritmos.map((a) => a.nome),
            datasets: [{
                data: c.algoritmos.map((a) => Math.max(a[medida], medida === "tempoMs" ? 0.1 : 1)),
                backgroundColor: c.algoritmos.map(corClasse),
                ...barra,
            }],
        },
        options: {
            indexAxis: "y",
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: "top",
                    align: "end",
                    labels: {
                        generateLabels: () => classes.map((cl) => ({
                            text: cl,
                            fillStyle: cl === "O(n²)" ? cor("--serie-3") : cor("--serie-7"),
                            strokeStyle: "transparent",
                            fontColor: cor("--texto-2"),
                        })),
                    },
                    onClick: () => {},
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const a = c.algoritmos[ctx.dataIndex];
                            return medida === "tempoMs"
                                ? ` ${formatarTempo(a.tempoMs)}`
                                : ` ${fmtInt.format(a[medida])} ${medida === "trocas" ? "trocas" : "comparações"}`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    type: "logarithmic",
                    title: { display: true, text: NOMES_MEDIDA[medida] + (medida === "tempoMs" ? " (ms)" : "") },
                    // só as potências de 10 ganham linha e rótulo: cada linha = 10× a anterior
                    grid: { color: (ctx) => (ehPotenciaDe10(ctx.tick?.value) ? cor("--grade") : "transparent") },
                    border: { display: false },
                    ticks: {
                        maxRotation: 0,
                        autoSkip: false,
                        callback: (v) => (ehPotenciaDe10(v) ? fmtCompacto.format(v) : ""),
                    },
                },
                y: eixoCategoria(),
            },
        },
    });
}

function ehPotenciaDe10(v) {
    if (!v || v <= 0) return false;
    const exp = Math.log10(v);
    return Math.abs(exp - Math.round(exp)) < 1e-9;
}

function trocarMedida(medida) {
    estado.medida = medida;
    document.querySelectorAll(".alternador button").forEach((b) =>
        b.classList.toggle("ativo", b.dataset.medida === medida));
    mostrarComparativo();
}

// --------------------------------------------------------------------------
// Início
// --------------------------------------------------------------------------

function redesenharTudo() {
    if (typeof window.Chart !== "undefined") configurarChart();
    mostrarTabela();
    mostrarEstatisticas();
    mostrarComparativo();
    if (estado.resultado && typeof window.L !== "undefined") {
        estado.chaveMapa = null; // força recolorir os pontos
        mostrarMapa();
    }
}

async function iniciar() {
    $("btnOrdenar").addEventListener("click", ordenar);
    $("btnComparar").addEventListener("click", comparar);
    $("pagPrimeira").addEventListener("click", () => irParaPagina(0));
    $("pagAnterior").addEventListener("click", () => irParaPagina(estado.pagina - 1));
    $("pagProxima").addEventListener("click", () => irParaPagina(estado.pagina + 1));
    $("pagUltima").addEventListener("click", () => irParaPagina(Number.MAX_SAFE_INTEGER));
    document.querySelectorAll(".alternador button").forEach((b) =>
        b.addEventListener("click", () => trocarMedida(b.dataset.medida)));
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", redesenharTudo);

    if (!bibliotecasCarregadas()) {
        mostrarErro("os gráficos e/ou o mapa não carregaram (Chart.js e Leaflet vêm da internet). " +
            "A ordenação e a tabela continuam funcionando.");
    } else {
        configurarChart();
    }

    try {
        const [status, opcoes, todas] = await Promise.all([
            api("/api/status"),
            api("/api/opcoes"),
            api("/api/estatisticas", { top: 10 }),
        ]);
        estado.opcoes = opcoes;
        estado.ordemBiomas = todas.porBioma.map((b) => b.rotulo).sort((a, b) => a.localeCompare(b, "pt-BR"));
        definirStatus(`API ok · ${fmtInt.format(status.focos)} focos`, "ok");
        preencherControles(opcoes);
        await ordenar(); // já abre com um resultado: data + Merge Sort
    } catch (e) {
        definirStatus("API fora do ar", "erro");
        mostrarErro(e.message);
    }
}

document.addEventListener("DOMContentLoaded", iniciar);
