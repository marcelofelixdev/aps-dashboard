package br.unip.aps.web;

import br.unip.aps.service.EstatisticaService;
import br.unip.aps.service.OrdenacaoService;
import br.unip.aps.sort.Algoritmo;
import br.unip.aps.sort.Criterio;
import br.unip.aps.web.Parametros.ParametroInvalidoException;
import io.javalin.Javalin;
import io.javalin.http.HttpResponseException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Endpoints REST do dashboard. Esta classe só recebe a requisição, valida os parâmetros e devolve
 * JSON; quem ordena e calcula são os serviços.
 *
 * <pre>
 * GET /api/status
 * GET /api/opcoes
 * GET /api/ordenar?criterio={DATA|BIOMA|MUNICIPIO}&amp;algoritmo={BUBBLE|INSERTION|SELECTION|MERGE|QUICK|HEAP}[&amp;ano=2024]
 * GET /api/comparar[?criterio={DATA|BIOMA|MUNICIPIO}][&amp;amostra=3000]
 * GET /api/estatisticas[?ano=2024][&amp;top=10]
 * </pre>
 *
 * Erros de parâmetro respondem 400 com {@code {"erro": "..."}}.
 */
public final class ApiRoutes {

    private ApiRoutes() {
    }

    public static void registrar(Javalin app, OrdenacaoService ordenacao, EstatisticaService estatisticas) {

        app.get("/api/status", ctx -> ctx.json(Map.of(
                "status", "ok",
                "focos", ordenacao.total(),
                "anos", ordenacao.anosDisponiveis())));

        app.get("/api/opcoes", ctx -> ctx.json(opcoes(ordenacao)));

        app.get("/api/ordenar", ctx -> {
            Criterio criterio = Parametros.criterio(ctx.queryParam("criterio"));
            Algoritmo algoritmo = Parametros.algoritmo(ctx.queryParam("algoritmo"));
            Integer ano = Parametros.ano(ctx.queryParam("ano"), ordenacao.anosDisponiveis());
            ctx.json(ordenacao.ordenar(criterio, algoritmo, ano));
        });

        app.get("/api/comparar", ctx -> {
            String criterioParam = ctx.queryParam("criterio");
            Criterio criterio = (criterioParam == null || criterioParam.isBlank())
                    ? Criterio.DATA
                    : Parametros.criterio(criterioParam);

            int amostra = Parametros.inteiro(
                    ctx.queryParam("amostra"),
                    "amostra",
                    Math.min(3000, ordenacao.total()),
                    0,
                    ordenacao.total()
            );

            ctx.json(ordenacao.comparar(criterio, amostra));
        });

        app.get("/api/estatisticas", ctx -> {
            Integer ano = Parametros.ano(ctx.queryParam("ano"), ordenacao.anosDisponiveis());
            int top = Parametros.inteiro(ctx.queryParam("top"), "top", 10, 1, 100);
            ctx.json(estatisticas.calcular(ano, top));
        });

        app.exception(ParametroInvalidoException.class, (e, ctx) ->
                ctx.status(400).json(Map.of("erro", e.getMessage())));

        app.exception(Exception.class, (e, ctx) -> {
            if (e instanceof HttpResponseException http) { // 404, 405 etc. do próprio Javalin
                ctx.status(http.getStatus()).json(Map.of("erro", String.valueOf(http.getMessage())));
                return;
            }
            System.err.println("Erro inesperado em " + ctx.path() + ": " + e);
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "erro interno no servidor: " + e.getMessage()));
        });
    }

    /** Valores aceitos em cada parâmetro, para o dashboard montar os seletores. */
    static Map<String, Object> opcoes(OrdenacaoService ordenacao) {
        List<Map<String, Object>> criterios = new ArrayList<>();
        for (Criterio c : Criterio.values()) {
            criterios.add(Map.of("codigo", c.name(), "nome", nomeCriterio(c)));
        }

        List<Map<String, Object>> algoritmos = new ArrayList<>();
        for (Algoritmo a : Algoritmo.values()) {
            Map<String, Object> info = new LinkedHashMap<>();
            info.put("codigo", a.name());
            info.put("nome", a.criar().nome());
            info.put("complexidadeMedia", a.complexidadeMedia());
            info.put("complexidadeMelhorCaso", a.complexidadeMelhorCaso());
            info.put("estavel", a.estavel());
            algoritmos.add(info);
        }

        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("criterios", criterios);
        resposta.put("algoritmos", algoritmos);
        resposta.put("anos", ordenacao.anosDisponiveis());
        return resposta;
    }

    private static String nomeCriterio(Criterio c) {
        return switch (c) {
            case DATA -> "Data";
            case BIOMA -> "Bioma";
            case MUNICIPIO -> "Município";
        };
    }
}
