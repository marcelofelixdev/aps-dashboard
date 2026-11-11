/* Página inicial: os focos em movimento, o custo de ordenar, os algoritmos e a barra de temas. */

"use strict";

// --------------------------------------------------------------------------
// Os focos: cada foco é um "pixel" colorido pela data. Na vista "mapa" ele fica
// na sua posição geográfica; na vista "ordem" os focos se enfileiram por data,
// da esquerda para a direita, e as cores formam uma faixa contínua.
// --------------------------------------------------------------------------

const RAMPA = [[242, 181, 58], [223, 95, 30], [134, 27, 16]]; // amarelo → laranja → vermelho-escuro

function corDaData(t) {
    const [a, b, u] = t < 0.5 ? [RAMPA[0], RAMPA[1], t / 0.5] : [RAMPA[1], RAMPA[2], (t - 0.5) / 0.5];
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * u)).join(",")})`;
}

const campo = {
    focos: [],      // { lat, lon, t (0..1 = posição no tempo), cor }
    mapa: [],       // posições [x, y] na vista mapa
    ordem: [],      // posições [x, y] na vista ordem
    atual: [],      // posições desenhadas agora
    lado: 3,        // tamanho do pixel na tela
    vista: "mapa",
    marcas: [],     // rótulos de ano na vista ordem
    animacao: null,
};

function prepararCampo(dados) {
    // dados já vêm em ordem de data (ordenados pela API)
    const t0 = new Date(dados[0].dataHora).getTime();
    const t1 = new Date(dados[dados.length - 1].dataHora).getTime();
    campo.focos = dados.map((f) => {
        const t = (new Date(f.dataHora).getTime() - t0) / (t1 - t0 || 1);
        return { lat: f.latitude, lon: f.longitude, t, cor: corDaData(t), ano: f.dataHora.slice(0, 4) };
    });
    calcularPosicoes();
    campo.atual = campo.mapa.map((p) => [...p]);
    desenharCampo(0);
}

function calcularPosicoes() {
    const canvas = $("campoFocos");
    const dpr = window.devicePixelRatio || 1;
    const L = canvas.clientWidth;
    const A = canvas.clientHeight;
    canvas.width = Math.round(L * dpr);
    canvas.height = Math.round(A * dpr);
    canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);

    const n = campo.focos.length;
    const margem = 18;

    // vista mapa: projeção simples (longitude corrigida pelo cosseno da latitude média)
    const lats = campo.focos.map((f) => f.lat);
    const lons = campo.focos.map((f) => f.lon);
    const [latMin, latMax] = [Math.min(...lats), Math.max(...lats)];
    const [lonMin, lonMax] = [Math.min(...lons), Math.max(...lons)];
    const k = Math.cos(((latMin + latMax) / 2) * Math.PI / 180);
    const largura = (lonMax - lonMin) * k;
    const altura = latMax - latMin;
    const escala = Math.min((L - 2 * margem) / largura, (A - 2 * margem) / altura);
    const dx = (L - largura * escala) / 2;
    const dy = (A - altura * escala) / 2;
    campo.mapa = campo.focos.map((f) => [dx + (f.lon - lonMin) * k * escala, dy + (latMax - f.lat) * escala]);

    // vista ordem: grade preenchida coluna a coluna, de cima para baixo; o tempo corre da esquerda para a direita
    const areaL = L - 2 * margem;
    const areaA = A - 2 * margem - 20; // espaço para os rótulos de ano
    const passo = Math.sqrt((areaL * areaA) / n);
    const linhas = Math.max(1, Math.floor(areaA / passo));
    const colunas = Math.ceil(n / linhas);
    const passoX = areaL / colunas;
    const passoY = areaA / linhas;
    campo.lado = Math.max(1.5, Math.min(passoX, passoY) * 0.82);
    campo.ordem = campo.focos.map((_, i) => [
        margem + Math.floor(i / linhas) * passoX,
        margem + (i % linhas) * passoY,
    ]);

    // rótulos: onde começa cada ano
    campo.marcas = [];
    let anoAnterior = null;
    campo.focos.forEach((f, i) => {
        if (f.ano !== anoAnterior) {
            campo.marcas.push({ texto: f.ano, x: campo.ordem[i][0] });
            anoAnterior = f.ano;
        }
    });
}

/** @param p quanto da vista "ordem" está visível (0 = mapa, 1 = ordem), para os rótulos */
function desenharCampo(p) {
    const canvas = $("campoFocos");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    const lado = campo.lado;
    campo.focos.forEach((f, i) => {
        ctx.fillStyle = f.cor;
        ctx.fillRect(campo.atual[i][0], campo.atual[i][1], lado, lado);
    });
    if (p > 0) {
        ctx.globalAlpha = p;
        ctx.fillStyle = cor("--tinta-2");
        ctx.font = `600 12px ${getComputedStyle(document.body).fontFamily}`;
        for (const m of campo.marcas) {
            ctx.fillText(m.texto, m.x, canvas.clientHeight - 10);
            ctx.fillRect(m.x, canvas.clientHeight - 30, 1, 8);
        }
        ctx.globalAlpha = 1;
    }
}

/** Leva os focos para a vista pedida. Cada foco sai com um pequeno atraso, na ordem da data. */
function irPara(vista, animar = true) {
    campo.vista = vista;
    document.querySelectorAll("[data-vista]").forEach((b) => {
        const ativo = b.dataset.vista === vista;
        b.classList.toggle("ativo", ativo);
        b.setAttribute("aria-pressed", String(ativo));
    });
    if (!campo.focos.length) return;

    const destino = vista === "mapa" ? campo.mapa : campo.ordem;
    const origem = campo.atual.map((p) => [...p]);
    const pFinal = vista === "ordem" ? 1 : 0;
    cancelAnimationFrame(campo.animacao);

    if (!animar || matchMedia("(prefers-reduced-motion: reduce)").matches) {
        campo.atual = destino.map((p) => [...p]);
        desenharCampo(pFinal);
        return;
    }

    const DURACAO = 1100;   // cada foco
    const ESPALHAR = 700;   // diferença entre o primeiro e o último foco
    const n = campo.focos.length;
    const inicio = performance.now();
    const suave = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

    function quadro(agora) {
        const decorrido = agora - inicio;
        for (let i = 0; i < n; i++) {
            const u = Math.min(1, Math.max(0, (decorrido - (i / n) * ESPALHAR) / DURACAO));
            const e = suave(u);
            campo.atual[i][0] = origem[i][0] + (destino[i][0] - origem[i][0]) * e;
            campo.atual[i][1] = origem[i][1] + (destino[i][1] - origem[i][1]) * e;
        }
        const geral = Math.min(1, decorrido / (DURACAO + ESPALHAR));
        desenharCampo(vista === "ordem" ? geral : 1 - geral);
        if (decorrido < DURACAO + ESPALHAR) campo.animacao = requestAnimationFrame(quadro);
    }
    campo.animacao = requestAnimationFrame(quadro);
}

async function iniciarCampo() {
    document.querySelectorAll("[data-vista]").forEach((b) =>
        b.addEventListener("click", () => irPara(b.dataset.vista)));
    irPara("mapa", false);

    const r = await api("/api/ordenar", { criterio: "DATA", algoritmo: "MERGE" });
    prepararCampo(r.dados);

    // o único movimento automático da página: depois de um instante, os focos entram em ordem
    setTimeout(() => { if (campo.vista === "mapa") irPara("ordem"); }, 900);

    let espera;
    window.addEventListener("resize", () => {
        clearTimeout(espera);
        espera = setTimeout(() => {
            calcularPosicoes();
            campo.atual = (campo.vista === "mapa" ? campo.mapa : campo.ordem).map((p) => [...p]);
            desenharCampo(campo.vista === "ordem" ? 1 : 0);
        }, 150);
    });
    aoTrocarTema(() => desenharCampo(campo.vista === "ordem" ? 1 : 0));
}

// --------------------------------------------------------------------------
// Tabela dos algoritmos (complexidade média e estabilidade vêm da API)
// --------------------------------------------------------------------------

const EXPLICACAO = {
    BUBBLE: { ideia: "Troca vizinhos fora de ordem, passada após passada; para quando uma passada não troca nada.",
        melhor: "O(n)", pior: "O(n²)", memoria: "O(1)" },
    INSERTION: { ideia: "Insere cada elemento na posição certa da parte já ordenada, como cartas na mão.",
        melhor: "O(n)", pior: "O(n²)", memoria: "O(1)" },
    SELECTION: { ideia: "Procura o menor da parte não ordenada e o coloca na próxima posição. Compara sempre o mesmo tanto.",
        melhor: "O(n²)", pior: "O(n²)", memoria: "O(1)" },
    MERGE: { ideia: "Divide ao meio, ordena cada metade e intercala as duas. Precisa de um vetor auxiliar.",
        melhor: "O(n log n)", pior: "O(n log n)", memoria: "O(n)" },
    QUICK: { ideia: "Separa menores e maiores que um pivô (mediana de três) e ordena cada lado.",
        melhor: "O(n log n)", pior: "O(n²)", memoria: "O(log n)" },
    HEAP: { ideia: "Monta um heap máximo e leva o maior para o fim, repetidamente, sem memória extra.",
        melhor: "O(n log n)", pior: "O(n log n)", memoria: "O(1)" },
};

function mostrarAlgoritmos(opcoes) {
    const c = (v) => (v === "O(n²)" ? `<span class="quadratico">${v}</span>` : v);
    $("algoritmos").innerHTML = opcoes.algoritmos.map((a) => {
        const e = EXPLICACAO[a.codigo] ?? {};
        return `<tr>
            <td>${escapar(a.nome)}</td>
            <td class="ideia">${escapar(e.ideia ?? "")}</td>
            <td>${c(e.melhor ?? "–")}</td>
            <td>${c(a.complexidadeMedia)}</td>
            <td>${c(e.pior ?? "–")}</td>
            <td>${e.memoria ?? "–"}</td>
            <td>${a.estavel ? "sim" : "não"}</td>
        </tr>`;
    }).join("");
}

// --------------------------------------------------------------------------
// Barra de temas: clicar rola até a seção; ao rolar, o tema visível fica marcado
// --------------------------------------------------------------------------

function acompanharTemas() {
    const links = [...document.querySelectorAll(".temas a")];
    const secoes = links.map((a) => document.querySelector(a.getAttribute("href")));
    const barra = document.querySelector(".temas__lista");
    let ultimo;

    function atualizar() {
        const linha = document.querySelector(".temas").getBoundingClientRect().bottom + 40;
        let atual = null;
        for (const s of secoes) if (s.getBoundingClientRect().top <= linha) atual = s.id;
        if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) atual = secoes.at(-1).id;
        if (atual === ultimo) return;
        ultimo = atual;
        for (const a of links) {
            const ativo = a.getAttribute("href") === `#${atual}`;
            a.classList.toggle("ativo", ativo);
            if (ativo) barra.scrollTo({ left: a.offsetLeft - 24, behavior: "smooth" });
        }
    }
    addEventListener("scroll", atualizar, { passive: true });
    addEventListener("resize", atualizar);
    atualizar();
}

// --------------------------------------------------------------------------

async function iniciar() {
    acompanharTemas();
    try {
        const [status, opcoes, est] = await Promise.all([
            verificarApi(),
            api("/api/opcoes"),
            api("/api/estatisticas", { top: 1 }),
        ]);

        const n = status.focos;
        const quad = (n * (n - 1)) / 2;
        const nlogn = n * Math.log2(n);
        $("kFocos").textContent = fmtInt.format(n);
        $("kN").textContent = fmtInt.format(n);
        $("kQuadratico").textContent = fmtInt.format(quad);
        $("kNlogn").textContent = fmtInt.format(Math.round(nlogn));
        $("barraNlogn").style.width = `${(nlogn / quad) * 100}%`;

        $("resumoBiomas").textContent = "Os focos se dividem entre " + est.porBioma
            .map((b) => `${b.rotulo} (${porcentagem(b.focos, est.totalFocos)})`)
            .join(" e ") + ".";

        mostrarAlgoritmos(opcoes);
        await iniciarCampo();
    } catch (e) {
        mostrarErro(e.message);
    }
}

document.addEventListener("DOMContentLoaded", iniciar);
