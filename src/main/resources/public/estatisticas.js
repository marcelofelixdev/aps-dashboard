/* Página "Estatísticas": gráficos a partir de /api/estatisticas. */

"use strict";

const NOMES_MES = { jan: "janeiro", fev: "fevereiro", mar: "março", abr: "abril", mai: "maio", jun: "junho",
    jul: "julho", ago: "agosto", set: "setembro", out: "outubro", nov: "novembro", dez: "dezembro" };

let estatisticas = null;

async function carregar() {
    limparErro();
    try {
        estatisticas = await api("/api/estatisticas", { ano: $("ano").value, top: $("top").value });
        mostrar();
    } catch (e) {
        mostrarErro(e.message);
    }
}

function mostrar() {
    const e = estatisticas;
    if (!e) return;

    // resumo
    const mesPico = e.porMes.reduce((m, c) => (c.focos > m.focos ? c : m), e.porMes[0]);
    const [abrev, anoPico] = mesPico.rotulo.split("/");
    const topo = e.topMunicipios[0];
    $("kFocos").textContent = fmtInt.format(e.totalFocos);
    $("kMunicipios").textContent = fmtInt.format(e.municipiosDistintos);
    $("kMes").textContent = `${abrev}/${anoPico}`;
    $("kMesSub").textContent = `${fmtInt.format(mesPico.focos)} focos (${porcentagem(mesPico.focos, e.totalFocos)} do período)`;
    $("kMunicipio").textContent = topo ? topo.rotulo : "–";
    $("kMunicipioSub").textContent = topo ? `${fmtInt.format(topo.focos)} focos` : "";

    // período seco: jul–out
    const seco = e.porMes.filter((c) => ["jul", "ago", "set", "out"].includes(c.rotulo.split("/")[0]))
        .reduce((s, c) => s + c.focos, 0);
    $("notaMes").textContent =
        `${porcentagem(seco, e.totalFocos)} dos focos entre julho e outubro, com pico em ${NOMES_MES[abrev]} de ${anoPico}`;

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
                borderWidth: { top: 2 }, // fresta entre os segmentos empilhados
                borderSkipped: false,
                borderRadius: 2,
                maxBarThickness: 28,
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
    $("notaBioma").textContent = e.porBioma
        .map((b) => `${b.rotulo}: ${porcentagem(b.focos, e.totalFocos)}`).join(", ");

    // ranking de municípios (magnitude sem identidade → cor neutra); a altura acompanha o tamanho do ranking
    $("caixaMunicipios").style.minHeight = `${Math.max(320, e.topMunicipios.length * 26 + 40)}px`;
    $("tituloMunicipios").textContent = `${e.topMunicipios.length} municípios com mais focos`;
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
            scales: { x: eixoValor(), y: { ...eixoCategoria(), ticks: { autoSkip: false } } },
        },
    });
}

async function iniciar() {
    $("ano").addEventListener("change", carregar);
    $("top").addEventListener("change", carregar);
    aoTrocarTema(mostrar);

    try {
        const [, opcoes, todas] = await Promise.all([
            verificarApi(),
            api("/api/opcoes"),
            api("/api/estatisticas", { top: 1 }),
        ]);
        definirBiomas(todas.porBioma.map((b) => b.rotulo));
        preencherAnos(opcoes);
        await carregar();
    } catch (e) {
        mostrarErro(e.message);
    }
}

document.addEventListener("DOMContentLoaded", iniciar);
