/* Página "Ordenação": chama /api/ordenar e mostra métricas, tabela paginada e mapa. */

"use strict";

const TAMANHO_PAGINA = 25;
const CENTRO_SP = [-22.3, -48.6];

const estado = {
    opcoes: null,
    resultado: null,
    pagina: 0,
    mapa: null,
    camadaPontos: null,
    chaveMapa: null, // evita redesenhar o mapa quando os pontos não mudaram
};

// --------------------------------------------------------------------------
// Roleta dos números: cada dígito é uma "fita" vertical 0–9 que rola até o valor
// --------------------------------------------------------------------------

const METRICAS = ["mComparacoes", "mTrocas", "mTempo", "mTotal"];
const VOLTAS = 3; // a fita tem 0–9 repetido 3 vezes, para dar mais de uma volta
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const semMovimento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function fitaHTML() {
    let numeros = "";
    for (let i = 0; i < 10 * VOLTAS; i++) numeros += `<span>${i % 10}</span>`;
    return `<span class="fita">${numeros}</span>`;
}

/** Monta o contador: dígitos viram colunas que rolam; pontos, vírgulas e letras ficam parados. */
function montarContador(el, texto) {
    let coluna = 0;
    const partes = [...texto].map((ch) => {
        if (!/\d/.test(ch)) return `<span class="sep">${ch === " " ? "&nbsp;" : escapar(ch)}</span>`;
        // colunas alternadas: uma cai, a outra sobe
        const sentido = coluna++ % 2 === 0 ? "cai" : "sobe";
        return `<span class="digito ${sentido}" data-valor="${ch}">${fitaHTML()}</span>`;
    });
    el.innerHTML = `<span class="contador" aria-hidden="true">${partes.join("")}</span>`;
    el.setAttribute("aria-label", texto);
}

/** Enquanto espera a resposta, os dígitos giram sem parar (mantém a quantidade de dígitos atual). */
function girarSemParar(el) {
    if (semMovimento()) return;
    const atual = el.getAttribute("aria-label") || el.textContent;
    const molde = /\d/.test(atual) ? atual.replace(/\d/g, "0") : "0.000";
    montarContador(el, molde);
    el.querySelector(".contador").classList.add("girando");
}

/**
 * Para cada dígito no valor final, um depois do outro (da esquerda para a direita).
 * @param ordem posição do card (0–3), para os cards também pararem em sequência
 */
function pararNo(el, texto, ordem = 0) {
    if (semMovimento()) {
        el.textContent = texto;
        return;
    }
    montarContador(el, texto);
    const digitos = [...el.querySelectorAll(".digito")];

    // posição inicial (sem animação): a fita começa no topo (sobe) ou no fim (cai)
    for (const d of digitos) {
        const fita = d.firstElementChild;
        fita.style.transition = "none";
        const inicio = d.classList.contains("sobe") ? 0 : 10 * VOLTAS - 1;
        fita.style.transform = `translateY(${-inicio}em)`;
    }
    el.getBoundingClientRect(); // aplica a posição inicial antes de animar

    digitos.forEach((d, i) => {
        const fita = d.firstElementChild;
        const v = Number(d.dataset.valor);
        // "sobe" termina na última volta da fita; "cai" termina na primeira
        const destino = d.classList.contains("sobe") ? 10 * (VOLTAS - 1) + v : v;
        const duracao = 900 + i * 130 + ordem * 120;
        fita.style.transition = `transform ${duracao}ms cubic-bezier(.12, .8, .22, 1.04)`;
        requestAnimationFrame(() => { fita.style.transform = `translateY(${-destino}em)`; });
    });
}

function infoAlgoritmo(codigo) {
    return estado.opcoes.algoritmos.find((a) => a.codigo === codigo);
}

function atualizarDica() {
    $("dicaQuadratico").hidden = infoAlgoritmo($("algoritmo").value)?.complexidadeMedia !== "O(n²)";
}

async function ordenar() {
    limparErro();
    $("btnOrdenar").disabled = true;
    $("btnGirar").disabled = true;
    $("btnOrdenar").textContent = "Ordenando…";
    METRICAS.forEach((id) => girarSemParar($(id)));

    try {
        // a roleta gira pelo menos um pouco, mesmo quando a resposta chega na hora
        const [resultado] = await Promise.all([
            api("/api/ordenar", {
                criterio: $("criterio").value,
                algoritmo: $("algoritmo").value,
                ano: $("ano").value,
            }),
            esperar(700),
        ]);
        estado.resultado = resultado;
        estado.pagina = 0;
        mostrarMetricas();
        mostrarTabela();
        mostrarMapa();
    } catch (e) {
        mostrarErro(e.message);
        METRICAS.forEach((id) => { $(id).textContent = "–"; });
    } finally {
        $("btnOrdenar").disabled = false;
        $("btnGirar").disabled = !estado.resultado;
        $("btnOrdenar").textContent = "Ordenar";
    }
}

function mostrarMetricas() {
    const r = estado.resultado;
    pararNo($("mComparacoes"), fmtInt.format(r.comparacoes), 0);
    pararNo($("mTrocas"), fmtInt.format(r.trocas), 1);
    pararNo($("mTempo"), formatarTempo(r.tempoMs), 2);
    pararNo($("mTotal"), fmtInt.format(r.total), 3);

    const info = estado.opcoes.algoritmos.find((a) => a.nome === r.algoritmo);
    const criterio = nomeCriterio(estado.opcoes, r.criterio).toLowerCase();
    const partes = [r.algoritmo, `por ${criterio}`];
    if (r.ano) partes.push(String(r.ano));
    if (info) partes.push(info.complexidadeMedia, info.estavel ? "estável" : "não estável");
    $("resumoAlgoritmo").textContent = partes.join(", ");

    // referência teórica: quanto seria n² e n·log₂n para este n
    const n = r.total;
    const n2 = (n * (n - 1)) / 2;
    const nlogn = n * Math.log2(Math.max(n, 2));
    $("explicacaoResultado").textContent =
        `Para comparar: com n = ${fmtInt.format(n)} focos, n(n−1)/2 ≈ ${fmtCompacto.format(n2)} e ` +
        `n·log₂n ≈ ${fmtCompacto.format(nlogn)}. ` +
        `Este resultado fez ${fmtCompacto.format(r.comparacoes)} comparações.`;
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
                color: superficie, // anel da cor do fundo separa pontos sobrepostos
                fillColor: corBioma(f.bioma),
                fillOpacity: 0.85,
            }).bindPopup(() =>
                `<strong>${escapar(f.municipio)}</strong><br>${formatarData(f.dataHora)}<br>${escapar(f.bioma)}`));
        estado.camadaPontos = L.featureGroup(pontos).addTo(estado.mapa);
        estado.chaveMapa = chave;
        if (pontos.length) estado.mapa.fitBounds(estado.camadaPontos.getBounds(), { padding: [16, 16] });
    }
    $("legendaMapa").innerHTML = legendaBiomas();
}

async function iniciar() {
    $("btnOrdenar").addEventListener("click", ordenar);
    $("btnGirar").addEventListener("click", () => {
        METRICAS.forEach((id) => girarSemParar($(id)));
        setTimeout(mostrarMetricas, 500);
    });
    $("pagPrimeira").addEventListener("click", () => irParaPagina(0));
    $("pagAnterior").addEventListener("click", () => irParaPagina(estado.pagina - 1));
    $("pagProxima").addEventListener("click", () => irParaPagina(estado.pagina + 1));
    $("pagUltima").addEventListener("click", () => irParaPagina(Number.MAX_SAFE_INTEGER));
    aoTrocarTema(() => {
        mostrarTabela();
        if (estado.resultado && estado.mapa) {
            estado.chaveMapa = null; // força recolorir os pontos
            mostrarMapa();
        }
    });

    try {
        const [, opcoes, est] = await Promise.all([
            verificarApi(),
            api("/api/opcoes"),
            api("/api/estatisticas", { top: 1 }),
        ]);
        estado.opcoes = opcoes;
        definirBiomas(est.porBioma.map((b) => b.rotulo));
        preencherCriterios(opcoes);
        preencherAlgoritmos(opcoes);
        preencherAnos(opcoes);
        $("algoritmo").addEventListener("change", atualizarDica);
        atualizarDica();
        await ordenar(); // já abre com um resultado: data + Merge Sort
    } catch (e) {
        mostrarErro(e.message);
    }
}

document.addEventListener("DOMContentLoaded", iniciar);
