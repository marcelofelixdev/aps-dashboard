/* ==========================================================================
   Código compartilhado por todas as páginas do dashboard:
   menu de navegação, chamadas à API, formatação e cores.
   ========================================================================== */

"use strict";

const PAGINAS = [
    { arquivo: "index.html", titulo: "Sobre o projeto", icone: "info", cor: "fogo" },
    { arquivo: "ordenacao.html", titulo: "Ordenação", icone: "ordenar", cor: "azul" },
    { arquivo: "comparativo.html", titulo: "Comparativo", icone: "comparar", cor: "violeta" },
    { arquivo: "estatisticas.html", titulo: "Estatísticas", icone: "grafico", cor: "ambar" },
    { arquivo: "previsoes.html", titulo: "Previsões", icone: "escudo", cor: "fogo" },
];

/**
 * Ícones desenhados pelo grupo (traço de 24×24). Use no HTML com <span data-icone="nome"></span>.
 */
const ICONES = {
    chama: '<path d="M12 2.5c1.6 3.6 6 6.2 6 11.2a6 6 0 0 1-12 0c0-3 1.9-4.7 3-6.6.3 2 1.3 3.3 2.7 3.7-.5-2.8-.4-5.6.3-8.3z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    ordenar: '<path d="M7 4v16M3.5 16.5 7 20l3.5-3.5M13 6h8M13 12h6M13 18h3"/>',
    comparar: '<path d="M12 3v18M6 21h12M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
    grafico: '<path d="M4 20V4M4 20h16"/><rect x="7" y="12" width="3" height="5" rx="1"/><rect x="12" y="8" width="3" height="9" rx="1"/><rect x="17" y="5" width="3" height="12" rx="1"/>',
    alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    banco: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    fluxo: '<rect x="3" y="4" width="6" height="6" rx="1.5"/><rect x="15" y="4" width="6" height="6" rx="1.5"/><rect x="9" y="15" width="6" height="6" rx="1.5"/><path d="M9 7h6M18 10v2.5a2 2 0 0 1-2 2h-1M6 10v2.5a2 2 0 0 0 2 2h1"/>',
    relogio: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/>',
    codigo: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    letras: '<path d="M4 18 7.5 6 11 18M5.2 14h4.6M14 6h6l-6 12h6"/>',
    escudo: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.3 7.5 9.5 4.3-1.2 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
    satelite: '<rect x="9" y="9" width="6" height="6" rx="1" transform="rotate(45 12 12)"/><path d="m5 5 3 3M16 16l3 3M3 9l6-6M15 21l6-6M17 4a4 4 0 0 1 3 3M17 1a7 7 0 0 1 6 6"/>',
};

/**
 * Logo: 3×3 pixels, o do centro aceso. É assim que o satélite "vê" um foco de incêndio:
 * um pixel mais quente que os vizinhos.
 */
const LOGO_PIXELS = `<svg class="marca__pixels" viewBox="0 0 22 22" aria-hidden="true">
    <g fill="currentColor" opacity=".22">
        <rect x="0" y="0" width="6" height="6"/><rect x="8" y="0" width="6" height="6"/><rect x="16" y="0" width="6" height="6"/>
        <rect x="0" y="8" width="6" height="6"/><rect x="16" y="8" width="6" height="6"/>
        <rect x="0" y="16" width="6" height="6"/><rect x="8" y="16" width="6" height="6"/><rect x="16" y="16" width="6" height="6"/>
    </g>
    <rect x="8" y="8" width="6" height="6" fill="var(--quente)"/>
</svg>`;

function icone(nome, classe = "icone") {
    return `<svg class="${classe}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ` +
        `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] ?? ""}</svg>`;
}

/** Troca cada <span data-icone="x"> pelo SVG correspondente. */
function aplicarIcones(raiz = document) {
    raiz.querySelectorAll("[data-icone]").forEach((el) => {
        el.innerHTML = icone(el.dataset.icone);
        el.removeAttribute("data-icone");
    });
}

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
    const pagina = PAGINAS.find((p) => p.arquivo === atual) ?? PAGINAS[0];
    const links = PAGINAS.map((p) => {
        const ativo = p.arquivo === pagina.arquivo;
        return `<a href="${p.arquivo}"${ativo ? ' class="ativo" aria-current="page"' : ""}>${p.titulo}</a>`;
    }).join("");

    // cabeçalho e rodapé ficam fora do contêiner central, ocupando a largura toda da tela
    const cabecalho = $("cabecalho");
    const rodape = $("rodape");
    document.body.prepend(cabecalho);
    document.body.append(rodape);

    cabecalho.innerHTML = `
        <div class="barra">
            <a class="marca" href="index.html" aria-label="Focos de Incêndio SP, página inicial">
                ${LOGO_PIXELS}
                <span class="marca__titulo">Focos de Incêndio SP</span>
            </a>
            <nav class="menu" id="menu" aria-label="Páginas">${links}<span class="menu__indicador" aria-hidden="true"></span></nav>
            <span id="status" class="status status--carregando">conectando</span>
            <button class="menu-botao" type="button" aria-expanded="false" aria-controls="menu">Menu</button>
        </div>`;

    rodape.innerHTML = `
        <div class="rodape__conteudo">
            <span>APS de Estrutura de Dados, Ciência da Computação UNIP, 2º semestre de 2026</span>
            <span>Dados: <a href="https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/anual/EstadosBr_sat_ref/"
                target="_blank" rel="noopener">Programa Queimadas, INPE</a></span>
        </div>`;

    // menu "☰" no celular
    const botao = cabecalho.querySelector(".menu-botao");
    botao.addEventListener("click", () => {
        const aberto = cabecalho.classList.toggle("aberto");
        botao.setAttribute("aria-expanded", String(aberto));
        botao.textContent = aberto ? "Fechar" : "Menu";
    });

    animarIndicador();
}

/** Elementos com a classe "revelar" aparecem (sobem e surgem) quando entram na tela. */
function revelarAoRolar() {
    const itens = document.querySelectorAll(".revelar");
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
        itens.forEach((el) => el.classList.add("visivel"));
        return;
    }
    const observador = new IntersectionObserver((entradas) => {
        for (const e of entradas) {
            if (e.isIntersecting) {
                e.target.classList.add("visivel");
                observador.unobserve(e.target);
            }
        }
    }, { rootMargin: "0px 0px -8% 0px" });
    itens.forEach((el) => observador.observe(el));
}

/**
 * O sublinhado do menu desliza da aba da página anterior até a aba atual.
 * A posição da aba anterior fica guardada no sessionStorage entre uma página e outra.
 */
function animarIndicador() {
    const menu = document.querySelector(".menu");
    const ativo = menu.querySelector("a.ativo");
    const indicador = menu.querySelector(".menu__indicador");
    if (!ativo || getComputedStyle(indicador).display === "none") return;

    const posicao = (el) => ({ left: el.offsetLeft, width: el.offsetWidth });
    const aplicar = (p) => {
        indicador.style.transform = `translateX(${p.left}px)`;
        indicador.style.width = `${p.width}px`;
    };

    let anterior = null;
    try { anterior = JSON.parse(sessionStorage.getItem("abaAnterior")); } catch (e) { /* sem storage */ }

    const destino = posicao(ativo);
    if (anterior && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        indicador.style.transition = "none";
        aplicar(anterior);
        indicador.getBoundingClientRect(); // força o navegador a desenhar a posição antiga
        indicador.style.transition = "";
        requestAnimationFrame(() => aplicar(destino));
    } else {
        aplicar(destino);
    }

    try { sessionStorage.setItem("abaAnterior", JSON.stringify(destino)); } catch (e) { /* sem storage */ }
    window.addEventListener("resize", () => aplicar(posicao(ativo)));
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
        definirStatus(`API conectada, ${fmtInt.format(status.focos)} focos`, "ok");
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
        valor: a.codigo, texto: `${a.nome} (${a.complexidadeMedia})`,
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
    aplicarIcones();
    configurarChart();
});
