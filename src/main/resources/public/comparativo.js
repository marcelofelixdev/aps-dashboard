/* Página "Comparativo": roda os 6 algoritmos (/api/comparar) e explica o resultado. */

"use strict";

const NOMES_MEDIDA = { comparacoes: "Comparações", trocas: "Trocas / movimentações", tempoMs: "Tempo" };

const estado = {
    opcoes: null,
    comparativo: null,
    medida: "comparacoes",
    matriz: null, // { DATA: resultado, BIOMA: resultado, MUNICIPIO: resultado }
};

function ocupado(sim) {
    $("btnComparar").disabled = sim;
    $("btnMatriz").disabled = sim;
}

// --------------------------------------------------------------------------
// Comparativo de um critério
// --------------------------------------------------------------------------

async function comparar() {
    limparErro();
    ocupado(true);
    $("btnComparar").textContent = "Comparando…";
    try {
        estado.comparativo = await api("/api/comparar", { criterio: $("criterio").value, ano: $("ano").value });
        $("secaoResultado").hidden = false;
        $("secaoConclusoes").hidden = false;
        mostrarComparativo();
        mostrarConclusoes();
    } catch (e) {
        mostrarErro(e.message);
    } finally {
        ocupado(false);
        $("btnComparar").textContent = "Comparar os 6 algoritmos";
    }
}

function mostrarComparativo() {
    const c = estado.comparativo;
    if (!c) return;

    $("tituloComparativo").textContent = `Resultado por ${nomeCriterio(estado.opcoes, c.criterio).toLowerCase()}`;
    $("legendaComparativo").textContent =
        `${fmtInt.format(c.total)} focos${c.ano ? ` de ${c.ano}` : ""}, a mesma entrada para os seis. ` +
        `Eixo em escala logarítmica: cada linha da grade vale 10 vezes a anterior. Na tabela, em negrito, o mais rápido.`;

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

    // gráfico: uma medida por vez (nunca dois eixos); cor = classe de complexidade
    const medida = estado.medida;
    const corClasse = (complexidade) => (complexidade === "O(n²)" ? cor("--serie-3") : cor("--serie-7"));

    desenhar("gComparativo", {
        type: "bar",
        data: {
            labels: c.algoritmos.map((a) => a.nome),
            datasets: [{
                // escala log não aceita zero: valores 0 viram 1 só no desenho (a dica mostra o real)
                data: c.algoritmos.map((a) => Math.max(a[medida], medida === "tempoMs" ? 0.1 : 1)),
                backgroundColor: c.algoritmos.map((a) => corClasse(a.complexidadeMedia)),
                ...barra,
            }],
        },
        options: {
            indexAxis: "y",
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "top",
                    align: "end",
                    onClick: () => {},
                    labels: {
                        generateLabels: () => ["O(n²)", "O(n log n)"].map((cl) => ({
                            text: cl, fillStyle: corClasse(cl), strokeStyle: "transparent", fontColor: cor("--texto-2"),
                        })),
                    },
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const a = c.algoritmos[ctx.dataIndex];
                            if (medida === "tempoMs") return ` ${formatarTempo(a.tempoMs)}`;
                            return ` ${fmtInt.format(a[medida])} ${medida === "trocas" ? "trocas" : "comparações"}`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    type: "logarithmic",
                    title: { display: true, text: NOMES_MEDIDA[medida] + (medida === "tempoMs" ? " (ms)" : "") },
                    // só as potências de 10 ganham linha e rótulo
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
// Conclusões escritas a partir dos números (mudam a cada execução)
// --------------------------------------------------------------------------

function mostrarConclusoes() {
    const c = estado.comparativo;
    const algs = c.algoritmos;
    const por = (codigo) => algs.find((a) => a.codigo === codigo);
    const menor = (campo) => algs.reduce((m, a) => (a[campo] < m[campo] ? a : m));
    const maior = (campo) => algs.reduce((m, a) => (a[campo] > m[campo] ? a : m));
    const n = c.total;
    const itens = [];

    // 1. velocidade
    const rapido = menor("tempoMs");
    const lento = maior("tempoMs");
    itens.push(`<strong>${escapar(rapido.nome)}</strong> foi o mais rápido (${formatarTempo(rapido.tempoMs)}) e ` +
        `<strong>${escapar(lento.nome)}</strong> o mais lento (${formatarTempo(lento.tempoMs)}): ` +
        `uma diferença de cerca de <strong>${vezes(lento.tempoMs, rapido.tempoMs)}</strong>.`);

    // 2. O(n²) x O(n log n) em comparações
    const quad = algs.filter((a) => a.complexidadeMedia === "O(n²)");
    const nlog = algs.filter((a) => a.complexidadeMedia !== "O(n²)");
    const melhorQuad = quad.length ? quad.reduce((m, a) => (a.comparacoes < m.comparacoes ? a : m)) : null;
    const piorNlog = nlog.length ? nlog.reduce((m, a) => (a.comparacoes > m.comparacoes ? a : m)) : null;
    if (melhorQuad && piorNlog && melhorQuad.comparacoes > piorNlog.comparacoes) {
        itens.push(`Mesmo o melhor algoritmo O(n²) (${escapar(melhorQuad.nome)}, ` +
            `${fmtCompacto.format(melhorQuad.comparacoes)} comparações) fez ` +
            `<strong>${vezes(melhorQuad.comparacoes, piorNlog.comparacoes)}</strong> mais comparações que o ` +
            `pior O(n log n) (${escapar(piorNlog.nome)}, ${fmtCompacto.format(piorNlog.comparacoes)}). ` +
            `Com ${fmtInt.format(n)} elementos, n² e n·log n já estão em ordens de grandeza diferentes.`);
    }

    // 3. Selection: número fixo de comparações
    const sel = por("SELECTION");
    if (sel && sel.comparacoes === (n * (n - 1)) / 2) {
        itens.push(`O <strong>Selection Sort</strong> fez exatamente n(n−1)/2 = ${fmtInt.format(sel.comparacoes)} ` +
            `comparações — ele compara tudo com tudo, não importa a ordem da entrada. ` +
            `Em compensação, fez só ${fmtInt.format(sel.trocas)} trocas, ` +
            `${sel.codigo === menor("trocas").codigo ? "o menor número entre os seis" : "bem menos que os outros O(n²)"}.`);
    }

    // 4. Bubble x Insertion: mesmas trocas = número de inversões
    const bub = por("BUBBLE");
    const ins = por("INSERTION");
    if (bub && ins && bub.trocas === ins.trocas) {
        itens.push(`<strong>Bubble</strong> e <strong>Insertion</strong> fizeram o mesmo número de trocas ` +
            `(${fmtInt.format(bub.trocas)}). Não é coincidência: cada troca de vizinhos desfaz exatamente uma ` +
            `<em>inversão</em> (par fora de ordem), então os dois fazem tantas trocas quantas inversões a entrada tem. ` +
            `O Insertion compara menos porque para de procurar assim que acha a posição certa.`);
    }

    // 5. Merge: menos comparações, mas copia
    const mer = por("MERGE");
    if (mer && mer.codigo === menor("comparacoes").codigo) {
        itens.push(`O <strong>Merge Sort</strong> fez o menor número de comparações ` +
            `(${fmtInt.format(mer.comparacoes)}, abaixo de n·log₂n ≈ ${fmtInt.format(Math.round(n * Math.log2(n)))}, ` +
            `o máximo teórico dele), ` +
            `mas usa um vetor auxiliar do tamanho da lista e copia elementos o tempo todo ` +
            `(${fmtInt.format(mer.trocas)} cópias).`);
    }

    // 6. Critério DATA: entrada quase ordenada
    if (c.criterio === "DATA" && ins) {
        itens.push(`Por <strong>data</strong>, a entrada já vem quase ordenada no CSV do INPE. ` +
            `É o cenário favorável ao Insertion Sort, que aproveita a ordem existente: ` +
            `compare com a ordenação por município, em que ele precisa de bem mais operações.`);
    }

    $("conclusoes").innerHTML = itens.map((t) => `<li>${t}</li>`).join("");
}

// --------------------------------------------------------------------------
// Matriz algoritmo × critério (3 chamadas, uma por critério)
// --------------------------------------------------------------------------

async function rodarMatriz() {
    limparErro();
    ocupado(true);
    const criterios = estado.opcoes.criterios;
    const ano = $("ano").value;
    estado.matriz = {};
    $("secaoMatriz").hidden = false;
    mostrarMatriz();

    try {
        for (let i = 0; i < criterios.length; i++) {
            $("progressoMatriz").textContent = `rodando ${criterios[i].nome.toLowerCase()} (${i + 1} de ${criterios.length})…`;
            estado.matriz[criterios[i].codigo] = await api("/api/comparar", { criterio: criterios[i].codigo, ano });
            mostrarMatriz();
        }
        const total = Object.values(estado.matriz)[0]?.total ?? 0;
        $("progressoMatriz").textContent = `${fmtInt.format(total)} focos${ano !== "todos" ? ` de ${ano}` : ""}`;
    } catch (e) {
        mostrarErro(e.message);
        $("progressoMatriz").textContent = "interrompido";
    } finally {
        ocupado(false);
    }
}

function mostrarMatriz() {
    const criterios = estado.opcoes.criterios;
    $("cabecalhoMatriz").innerHTML = `<tr><th>Algoritmo</th>${criterios
        .map((c) => `<th class="num">${escapar(c.nome)}</th>`).join("")}</tr>`;

    // menor valor de cada coluna
    const minimo = {};
    for (const c of criterios) {
        const r = estado.matriz?.[c.codigo];
        if (r) minimo[c.codigo] = Math.min(...r.algoritmos.map((a) => a.comparacoes));
    }

    $("corpoMatriz").innerHTML = estado.opcoes.algoritmos.map((alg) => `
        <tr>
            <td>${escapar(alg.nome)}</td>
            ${criterios.map((c) => {
                const r = estado.matriz?.[c.codigo];
                if (!r) return '<td class="num nota">…</td>';
                const a = r.algoritmos.find((x) => x.codigo === alg.codigo);
                const melhor = a.comparacoes === minimo[c.codigo];
                return `<td class="num${melhor ? " celula-melhor" : ""}" title="${formatarTempo(a.tempoMs)}">` +
                    `${fmtInt.format(a.comparacoes)}</td>`;
            }).join("")}
        </tr>`).join("");
}

// --------------------------------------------------------------------------

async function iniciar() {
    $("btnComparar").addEventListener("click", comparar);
    $("btnMatriz").addEventListener("click", rodarMatriz);
    document.querySelectorAll(".alternador button").forEach((b) =>
        b.addEventListener("click", () => trocarMedida(b.dataset.medida)));
    aoTrocarTema(mostrarComparativo);

    try {
        const [, opcoes] = await Promise.all([verificarApi(), api("/api/opcoes")]);
        estado.opcoes = opcoes;
        preencherCriterios(opcoes);
        preencherAnos(opcoes);
        await comparar(); // já abre com o comparativo por data (o mais rápido de rodar)
    } catch (e) {
        mostrarErro(e.message);
    }
}

document.addEventListener("DOMContentLoaded", iniciar);
