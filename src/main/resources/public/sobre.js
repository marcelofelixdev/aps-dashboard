/* Página "Sobre o projeto": números da base e explicação dos algoritmos. */

"use strict";

/** Explicação de cada algoritmo (a complexidade média e a estabilidade vêm da API). */
const EXPLICACAO = {
    BUBBLE: {
        ideia: "Percorre a lista várias vezes trocando vizinhos fora de ordem. A cada passada, o maior elemento " +
            "restante \"borbulha\" até o fim. Para quando uma passada não troca nada.",
        melhor: "O(n)", pior: "O(n²)", memoria: "O(1)",
    },
    INSERTION: {
        ideia: "Mantém o começo da lista ordenado e insere cada novo elemento na posição certa, deslocando os " +
            "maiores para a direita — como quem organiza cartas na mão.",
        melhor: "O(n)", pior: "O(n²)", memoria: "O(1)",
    },
    SELECTION: {
        ideia: "A cada passada, procura o menor elemento da parte não ordenada e o coloca na próxima posição. " +
            "Faz sempre o mesmo número de comparações, mas é o que menos troca.",
        melhor: "O(n²)", pior: "O(n²)", memoria: "O(1)",
    },
    MERGE: {
        ideia: "Divide a lista ao meio, ordena cada metade recursivamente e intercala as duas metades já " +
            "ordenadas. Desempenho previsível em qualquer entrada, ao custo de um vetor auxiliar.",
        melhor: "O(n log n)", pior: "O(n log n)", memoria: "O(n)",
    },
    QUICK: {
        ideia: "Escolhe um pivô (aqui, a mediana entre início, meio e fim) e separa os menores dos maiores; " +
            "depois ordena cada lado. Costuma ser o mais rápido na prática.",
        melhor: "O(n log n)", pior: "O(n²)", memoria: "O(log n)",
    },
    HEAP: {
        ideia: "Organiza a lista como um heap máximo (árvore em que cada pai é maior que os filhos) e, " +
            "repetidamente, leva o maior para o fim. Garante O(n log n) sem memória extra.",
        melhor: "O(n log n)", pior: "O(n log n)", memoria: "O(1)",
    },
};

function mostrarAlgoritmos(opcoes) {
    $("algoritmos").innerHTML = opcoes.algoritmos.map((a) => {
        const e = EXPLICACAO[a.codigo] ?? {};
        return `
        <article class="algoritmo">
            <header>
                <h3>${escapar(a.nome)}</h3>
                <span class="selo ${a.complexidadeMedia === "O(n²)" ? "selo--quadratico" : "selo--nlogn"}">${a.complexidadeMedia}</span>
            </header>
            <p>${escapar(e.ideia ?? "")}</p>
            <dl class="ficha">
                <div><dt>Melhor</dt><dd>${e.melhor ?? "–"}</dd></div>
                <div><dt>Médio</dt><dd>${a.complexidadeMedia}</dd></div>
                <div><dt>Pior</dt><dd>${e.pior ?? "–"}</dd></div>
                <div><dt>Memória extra</dt><dd>${e.memoria ?? "–"}</dd></div>
                <div><dt>Estável</dt><dd>${a.estavel ? "sim" : "não"}</dd></div>
            </dl>
        </article>`;
    }).join("");
}

async function iniciar() {
    try {
        const [status, opcoes, est] = await Promise.all([
            verificarApi(),
            api("/api/opcoes"),
            api("/api/estatisticas", { top: 1 }),
        ]);

        $("kFocos").textContent = fmtInt.format(status.focos);
        $("kMunicipios").textContent = fmtInt.format(est.municipiosDistintos);
        $("kAnos").textContent = opcoes.anos.join(" e ");
        $("kAlgoritmos").textContent = fmtInt.format(opcoes.algoritmos.length);

        definirBiomas(est.porBioma.map((b) => b.rotulo));
        $("resumoBiomas").innerHTML = "Biomas presentes nos dados de SP: " + est.porBioma
            .map((b) => `<strong>${escapar(b.rotulo)}</strong> (${fmtInt.format(b.focos)} focos, ${porcentagem(b.focos, est.totalFocos)})`)
            .join(" e ") + ".";

        mostrarAlgoritmos(opcoes);
    } catch (e) {
        mostrarErro(e.message);
    }
}

document.addEventListener("DOMContentLoaded", iniciar);
