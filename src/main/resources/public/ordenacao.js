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

function infoAlgoritmo(codigo) {
    return estado.opcoes.algoritmos.find((a) => a.codigo === codigo);
}

function atualizarDica() {
    $("dicaQuadratico").hidden = infoAlgoritmo($("algoritmo").value)?.complexidadeMedia !== "O(n²)";
}

async function ordenar() {
    limparErro();
    $("btnOrdenar").disabled = true;
    $("btnOrdenar").textContent = "Ordenando…";
    document.querySelector(".metricas").classList.add("carregando");

    try {
        estado.resultado = await api("/api/ordenar", {
            criterio: $("criterio").value,
            algoritmo: $("algoritmo").value,
            ano: $("ano").value,
        });
        estado.pagina = 0;
        mostrarMetricas();
        mostrarTabela();
        mostrarMapa();
    } catch (e) {
        mostrarErro(e.message);
    } finally {
        $("btnOrdenar").disabled = false;
        $("btnOrdenar").textContent = "Ordenar";
        document.querySelector(".metricas").classList.remove("carregando");
    }
}

function mostrarMetricas() {
    const r = estado.resultado;
    $("mComparacoes").textContent = fmtInt.format(r.comparacoes);
    $("mTrocas").textContent = fmtInt.format(r.trocas);
    $("mTempo").textContent = formatarTempo(r.tempoMs);
    $("mTotal").textContent = fmtInt.format(r.total);

    const info = estado.opcoes.algoritmos.find((a) => a.nome === r.algoritmo);
    const criterio = nomeCriterio(estado.opcoes, r.criterio).toLowerCase();
    const partes = [r.algoritmo, `por ${criterio}`];
    if (r.ano) partes.push(String(r.ano));
    if (info) partes.push(info.complexidadeMedia, info.estavel ? "estável" : "não estável");
    $("resumoAlgoritmo").textContent = partes.join(" · ");

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
