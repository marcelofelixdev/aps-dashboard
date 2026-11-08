/* ==========================================================================
   Código compartilhado por todas as páginas do dashboard:
   menu de navegação, chamadas à API, formatação e cores.
   ========================================================================== */

"use strict";

const PAGINAS = [
    { arquivo: "index.html", titulo: "Sobre o projeto" },
    { arquivo: "ordenacao.html", titulo: "Ordenação" },
    { arquivo: "comparativo.html", titulo: "Comparativo" },
    { arquivo: "estatisticas.html", titulo: "Estatísticas" },
];

const fmtInt = new Intl.NumberFormat("pt-BR");
const fmtDec = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const fmtSeg = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtCompacto = new Intl.NumberFormat("pt-BR", { notation: "compact" });

const $ = (id) => document.getElementById(id);

// --------------------------------------------------------------------------
// Cabeçalho e menu (montados aqui para não repetir o HTML em cada página)
// --------------------------------------------------------------------------

function montarCabecalho() {
    const atual = location.pathname.split("/").pop() || "index.html";
    const links = PAGINAS.map((p) => {
        const ativo = p.arquivo === atual;
        return `<a href="${p.arquivo}"${ativo ? ' class="ativo" aria-current="page"' : ""}>${p.titulo}</a>`;
    }).join("");

    $("cabecalho").innerHTML = `
        <div class="cabecalho__linha">
            <a class="marca" href="index.html">
                <span class="marca__titulo">Focos de Incêndio · SP</span>
                <span class="marca__sub">Algoritmos de ordenação · APS UNIP 2026/2</span>
            </a>
            <span id="status" class="status status--carregando">conectando…</span>
        </div>
        <nav class="menu" aria-label="Páginas">${links}</nav>`;

    $("rodape").innerHTML = `
        APS · Ciência da Computação UNIP 2026/2 · Estrutura de Dados ·
        Fonte dos dados: <a href="https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/anual/EstadosBr_sat_ref/"
        target="_blank" rel="noopener">INPE – Programa Queimadas</a>`;
}

function definirStatus(texto, tipo) {
    const s = $("status");
    if (!s) return;
    s.textContent = texto;
    s.className = `status status--${tipo}`;
}

/** Confere se a API está no ar e mostra no canto do cabeçalho. Devolve o /api/status. */
async function verificarApi() {
    try {
        const status = await api("/api/status");
        definirStatus(`API ok · ${fmtInt.format(status.focos)} focos`, "ok");
        return status;
    } catch (e) {
        definirStatus("API fora do ar", "erro");
        throw e;
    }
}

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

// --------------------------------------------------------------------------
// Formatação
// --------------------------------------------------------------------------

function escapar(texto) {
    return String(texto).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
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

function porcentagem(parte, total) {
    return total ? `${fmtDec.format((parte / total) * 100)}%` : "–";
}

/** Quantas vezes a é maior que b, arredondado de um jeito legível ("~440×"). */
function vezes(a, b) {
    if (!b) return "∞";
    const r = a / b;
    if (r >= 100) return `${fmtInt.format(Math.round(r / 10) * 10)}×`;
    if (r >= 10) return `${fmtInt.format(Math.round(r))}×`;
    return `${fmtDec.format(r)}×`;
}

// --------------------------------------------------------------------------
// Cores (lidas do CSS, então mudam sozinhas no modo escuro)
// --------------------------------------------------------------------------

function cor(variavel) {
    return getComputedStyle(document.documentElement).getPropertyValue(variavel).trim();
}

/** Biomas em ordem alfabética: o 1º usa a cor de série 1, o 2º a cor 2. */
let ordemBiomas = [];

function definirBiomas(nomes) {
    ordemBiomas = [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function corBioma(bioma) {
    const i = ordemBiomas.indexOf(bioma);
    return i === 0 ? cor("--serie-1") : i === 1 ? cor("--serie-2") : cor("--neutro");
}

function legendaBiomas() {
    return ordemBiomas
        .map((b) => `<span class="chip" style="--cor:${corBioma(b)}">${escapar(b)}</span>`)
        .join("");
}

// --------------------------------------------------------------------------
// Gráficos (Chart.js) — só nas páginas que carregam a biblioteca
// --------------------------------------------------------------------------

const graficos = {};

function chartDisponivel() {
    return typeof window.Chart !== "undefined";
}

function configurarChart() {
    if (!chartDisponivel()) return;
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.size = 12;
    Chart.defaults.color = cor("--texto-2");
    Chart.defaults.borderColor = cor("--grade");
    Chart.defaults.plugins.tooltip.backgroundColor = cor("--texto");
    Chart.defaults.plugins.tooltip.titleColor = cor("--superficie");
    Chart.defaults.plugins.tooltip.bodyColor = cor("--superficie");
    Chart.defaults.plugins.tooltip.footerColor = cor("--superficie");
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.legend.labels.boxWidth = 10;
    Chart.defaults.plugins.legend.labels.boxHeight = 10;
    Chart.defaults.plugins.legend.labels.useBorderRadius = true;
    Chart.defaults.plugins.legend.labels.borderRadius = 5;
}

/** Cria (ou recria) um gráfico no canvas indicado. */
function desenhar(id, config) {
    if (!chartDisponivel()) {
        $(id).parentElement.innerHTML = '<div class="vazio">O gráfico precisa de internet para carregar (Chart.js).</div>';
        return;
    }
    graficos[id]?.destroy();
    graficos[id] = new Chart($(id), config);
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

/** Redesenha a página quando o sistema troca entre modo claro e escuro. */
function aoTrocarTema(redesenhar) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        configurarChart();
        redesenhar();
    });
}

// --------------------------------------------------------------------------
// Seletores de critério / algoritmo / ano (usados em mais de uma página)
// --------------------------------------------------------------------------

function preencherSelect(id, itens, valorPadrao) {
    $(id).innerHTML = itens.map((i) => `<option value="${i.valor}">${escapar(i.texto)}</option>`).join("");
    if (valorPadrao !== undefined) $(id).value = valorPadrao;
}

function preencherCriterios(opcoes, id = "criterio") {
    preencherSelect(id, opcoes.criterios.map((c) => ({ valor: c.codigo, texto: c.nome })));
}

function preencherAlgoritmos(opcoes, id = "algoritmo") {
    preencherSelect(id, opcoes.algoritmos.map((a) => ({
        valor: a.codigo, texto: `${a.nome} · ${a.complexidadeMedia}`,
    })), "MERGE");
}

function preencherAnos(opcoes, id = "ano") {
    preencherSelect(id, [{ valor: "todos", texto: "Todos" }]
        .concat(opcoes.anos.map((a) => ({ valor: a, texto: String(a) }))));
}

function nomeCriterio(opcoes, codigo) {
    return opcoes.criterios.find((c) => c.codigo === codigo)?.nome ?? codigo;
}

document.addEventListener("DOMContentLoaded", () => {
    montarCabecalho();
    configurarChart();
});
