package br.unip.aps.service;

import br.unip.aps.model.FocoIncendio;
import br.unip.aps.sort.MergeSort;
import br.unip.aps.sort.Metricas;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Estatísticas extras para os gráficos do dashboard: focos por mês, por bioma e municípios com mais
 * focos. As listas que precisam de ordem são ordenadas com o nosso próprio {@link MergeSort}.
 */
public class EstatisticaService {

    private static final String[] MESES = {
            "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"};

    private final List<FocoIncendio> focos;

    public EstatisticaService(List<FocoIncendio> focos) {
        this.focos = List.copyOf(focos);
    }

    /**
     * @param ano      só os focos deste ano, ou {@code null} para todos
     * @param topN     quantos municípios mostrar no ranking
     */
    public Estatisticas calcular(Integer ano, int topN) {
        List<FocoIncendio> selecionados = new ArrayList<>();
        for (FocoIncendio f : focos) {
            if (ano == null || f.dataHora().getYear() == ano) {
                selecionados.add(f);
            }
        }

        return new Estatisticas(
                ano,
                selecionados.size(),
                porAno(selecionados),
                porMes(selecionados),
                porBioma(selecionados),
                topMunicipios(selecionados, topN),
                municipiosDistintos(selecionados));
    }

    /** Contagem por ano, em ordem crescente de ano. */
    private List<Contagem> porAno(List<FocoIncendio> lista) {
        Map<String, Long> mapa = new LinkedHashMap<>();
        for (FocoIncendio f : lista) {
            mapa.merge(String.valueOf(f.dataHora().getYear()), 1L, Long::sum);
        }
        return ordenadoPor(mapa, Comparator.comparing(Contagem::rotulo));
    }

    /** Contagem por mês ("2024-09" → "set/2024"), em ordem cronológica, incluindo meses sem focos. */
    private List<Contagem> porMes(List<FocoIncendio> lista) {
        if (lista.isEmpty()) {
            return List.of();
        }
        Map<Integer, long[]> porAnoEMes = new LinkedHashMap<>(); // ano → 12 contadores
        int primeiroAno = Integer.MAX_VALUE;
        int ultimoAno = Integer.MIN_VALUE;
        for (FocoIncendio f : lista) {
            int a = f.dataHora().getYear();
            porAnoEMes.computeIfAbsent(a, k -> new long[12])[f.dataHora().getMonthValue() - 1]++;
            primeiroAno = Math.min(primeiroAno, a);
            ultimoAno = Math.max(ultimoAno, a);
        }
        List<Contagem> meses = new ArrayList<>();
        for (int a = primeiroAno; a <= ultimoAno; a++) {
            long[] doAno = porAnoEMes.getOrDefault(a, new long[12]);
            for (int m = 0; m < 12; m++) {
                meses.add(new Contagem(MESES[m] + "/" + a, doAno[m]));
            }
        }
        return meses;
    }

    /** Contagem por bioma, do que tem mais focos para o que tem menos. */
    private List<Contagem> porBioma(List<FocoIncendio> lista) {
        Map<String, Long> mapa = new LinkedHashMap<>();
        for (FocoIncendio f : lista) {
            mapa.merge(f.bioma(), 1L, Long::sum);
        }
        return ordenadoPor(mapa, maisFocosPrimeiro());
    }

    /** Os {@code n} municípios com mais focos (empate: ordem alfabética). */
    private List<Contagem> topMunicipios(List<FocoIncendio> lista, int n) {
        Map<String, Long> mapa = new LinkedHashMap<>();
        for (FocoIncendio f : lista) {
            mapa.merge(f.municipio(), 1L, Long::sum);
        }
        List<Contagem> todos = ordenadoPor(mapa, maisFocosPrimeiro());
        return new ArrayList<>(todos.subList(0, Math.min(n, todos.size())));
    }

    private int municipiosDistintos(List<FocoIncendio> lista) {
        Map<String, Boolean> vistos = new LinkedHashMap<>();
        for (FocoIncendio f : lista) {
            vistos.put(f.municipio(), true);
        }
        return vistos.size();
    }

    private static Comparator<Contagem> maisFocosPrimeiro() {
        return Comparator.comparingLong(Contagem::focos).reversed().thenComparing(Contagem::rotulo);
    }

    private static List<Contagem> ordenadoPor(Map<String, Long> mapa, Comparator<Contagem> ordem) {
        List<Contagem> lista = new ArrayList<>();
        mapa.forEach((rotulo, qtd) -> lista.add(new Contagem(rotulo, qtd)));
        new MergeSort().ordenar(lista, ordem, new Metricas());
        return lista;
    }

    /** Resposta de {@code GET /api/estatisticas}. */
    public record Estatisticas(
            Integer ano,
            int totalFocos,
            List<Contagem> porAno,
            List<Contagem> porMes,
            List<Contagem> porBioma,
            List<Contagem> topMunicipios,
            int municipiosDistintos
    ) {
    }

    /** Um par rótulo → quantidade de focos (uma barra de gráfico). */
    public record Contagem(String rotulo, long focos) {
    }
}
