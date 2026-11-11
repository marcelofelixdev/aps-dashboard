package br.unip.aps.service;

import br.unip.aps.model.FocoIncendio;
import br.unip.aps.sort.Algoritmo;
import br.unip.aps.sort.AlgoritmoOrdenacao;
import br.unip.aps.sort.Criterio;
import br.unip.aps.sort.InsertionSort;
import br.unip.aps.sort.Metricas;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Junta critério + algoritmo + métricas: recebe o pedido de ordenação, executa sobre uma CÓPIA dos
 * focos e devolve o resultado com as contagens de operações e o tempo gasto.
 */
public class OrdenacaoService {

    private static final DateTimeFormatter FORMATO_DATA = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final List<FocoIncendio> focos;

    public OrdenacaoService(List<FocoIncendio> focos) {
        this.focos = List.copyOf(focos); // imutável: nenhuma ordenação mexe na lista original
    }

    /**
     * Ordena os focos.
     *
     * @param criterio  critério de ordenação
     * @param algoritmo algoritmo a usar
     * @param ano       só os focos deste ano, ou {@code null} para todos
     */
    public ResultadoOrdenacao ordenar(Criterio criterio, Algoritmo algoritmo, Integer ano) {
        Objects.requireNonNull(criterio, "criterio");
        Objects.requireNonNull(algoritmo, "algoritmo");

        List<FocoIncendio> copia = copiaFiltrada(ano);
        Medicao m = executar(copia, criterio, algoritmo);

        List<FocoDto> dados = new ArrayList<>(copia.size());
        for (FocoIncendio f : copia) {
            dados.add(FocoDto.de(f));
        }

        return new ResultadoOrdenacao(m.nome(), criterio.name(), ano,
                m.comparacoes(), m.trocas(), m.tempoMs(), copia.size(), dados);
    }

    /**
     * Roda os seis algoritmos no mesmo critério, cada um sobre uma cópia nova da mesma entrada,
     * e devolve só as métricas (sem os focos), na ordem do enum {@link Algoritmo}.
     */
    public ResultadoComparacao comparar(Criterio criterio, Integer ano) {
        Objects.requireNonNull(criterio, "criterio");

        List<MedicaoAlgoritmo> medicoes = new ArrayList<>();
        int total = 0;
        for (Algoritmo algoritmo : Algoritmo.values()) {
            List<FocoIncendio> copia = copiaFiltrada(ano);
            total = copia.size();
            Medicao m = executar(copia, criterio, algoritmo);
            medicoes.add(new MedicaoAlgoritmo(algoritmo.name(), m.nome(),
                    m.comparacoes(), m.trocas(), m.tempoMs(),
                    algoritmo.complexidadeMedia(), algoritmo.estavel()));
        }
        return new ResultadoComparacao(criterio.name(), ano, total, medicoes);
    }

    /** 1. cópia da lista, filtrada pelo ano se pedido. */
    private List<FocoIncendio> copiaFiltrada(Integer ano) {
        List<FocoIncendio> copia = new ArrayList<>(focos.size());
        for (FocoIncendio f : focos) {
            if (ano == null || f.dataHora().getYear() == ano) {
                copia.add(f);
            }
        }
        return copia;
    }

    /** 2-4. comparador do critério, algoritmo com Metricas nova, tempo. Ordena {@code lista} no lugar. */
    private Medicao executar(List<FocoIncendio> lista, Criterio criterio, Algoritmo algoritmo) {
        AlgoritmoOrdenacao alg = algoritmo.criar();
        Metricas metricas = new Metricas();
        long inicio = System.nanoTime();
        alg.ordenar(lista, criterio.comparador(), metricas);
        double tempoMs = (System.nanoTime() - inicio) / 1_000_000.0;
        return new Medicao(alg.nome(), metricas.getComparacoes(), metricas.getTrocas(),
                Math.round(tempoMs * 10) / 10.0);
    }

    private record Medicao(String nome, long comparacoes, long trocas, double tempoMs) {
    }

    /** Anos presentes nos dados, em ordem crescente. */
    public List<Integer> anosDisponiveis() {
        List<Integer> anos = new ArrayList<>();
        for (FocoIncendio f : focos) {
            int a = f.dataHora().getYear();
            if (!anos.contains(a)) {
                anos.add(a);
            }
        }
        // poucos anos: inserção simples já basta
        new InsertionSort().ordenar(anos, Integer::compare, new Metricas());
        return anos;
    }

    public int total() {
        return focos.size();
    }

    /** Resposta de {@code GET /api/ordenar} (formato combinado no CONTRIBUTING.md). */
    public record ResultadoOrdenacao(
            String algoritmo,
            String criterio,
            Integer ano,
            long comparacoes,
            long trocas,
            double tempoMs,
            int total,
            List<FocoDto> dados
    ) {
    }

    /** Resposta de {@code GET /api/comparar}. */
    public record ResultadoComparacao(String criterio, Integer ano, int total, List<MedicaoAlgoritmo> algoritmos) {
    }

    /** Métricas de um algoritmo no comparativo. */
    public record MedicaoAlgoritmo(String codigo, String nome, long comparacoes, long trocas, double tempoMs,
                                   String complexidadeMedia, boolean estavel) {
    }

    /** Um foco no formato enviado ao navegador (data já como texto ISO, sem depender do Jackson). */
    public record FocoDto(String dataHora, String municipio, String bioma, double latitude, double longitude) {
        static FocoDto de(FocoIncendio f) {
            return new FocoDto(f.dataHora().format(FORMATO_DATA), f.municipio(), f.bioma(),
                    f.latitude(), f.longitude());
        }
    }
}
