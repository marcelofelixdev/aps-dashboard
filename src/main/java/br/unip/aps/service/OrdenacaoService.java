package br.unip.aps.service;

import br.unip.aps.model.FocoIncendio;
import br.unip.aps.sort.Algoritmo;
import br.unip.aps.sort.AlgoritmoOrdenacao;
import br.unip.aps.sort.Criterio;
import br.unip.aps.sort.InsertionSort;
import br.unip.aps.sort.Metricas;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Random;

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

        // 1. cópia da lista (filtrada pelo ano, se pedido)
        List<FocoIncendio> copia = new ArrayList<>(focos.size());
        for (FocoIncendio f : focos) {
            if (ano == null || f.dataHora().getYear() == ano) {
                copia.add(f);
            }
        }

        // 2-4. comparador do critério, algoritmo com Metricas nova, tempo
        AlgoritmoOrdenacao alg = algoritmo.criar();
        Metricas metricas = new Metricas();
        long inicio = System.nanoTime();
        alg.ordenar(copia, criterio.comparador(), metricas);
        double tempoMs = (System.nanoTime() - inicio) / 1_000_000.0;

        List<FocoDto> dados = new ArrayList<>(copia.size());
        for (FocoIncendio f : copia) {
            dados.add(FocoDto.de(f));
        }

        return new ResultadoOrdenacao(
                alg.nome(),
                criterio.name(),
                ano,
                metricas.getComparacoes(),
                metricas.getTrocas(),
                Math.round(tempoMs * 10) / 10.0,
                copia.size(),
                dados);
    }

    public ResultadoComparacao comparar(Criterio criterio, int amostra) {
        Objects.requireNonNull(criterio, "criterio");

        if (amostra < 0 || amostra > focos.size()) {
            throw new IllegalArgumentException("A amostra deve estar entre 0 e o total de registros.");
        }

        final int repeticoes = 3;
        final long semente = 20261102L;

        // 1. Define o tamanho da amostra.
        int tamanhoAmostra = amostra == 0 ? focos.size() : amostra;

        // 2. Cria uma cópia embaralhada, sem modificar a lista original.
        List<FocoIncendio> base = new ArrayList<>(focos);
        Collections.shuffle(base, new Random(semente));

        base = new ArrayList<>(base.subList(0, tamanhoAmostra));

        // 3. Obtém o comparador do critério escolhido.
        Comparator<FocoIncendio> comparador = criterio.comparador();

        // Aquecimento do comparador.
        for (FocoIncendio foco : base) {
            comparador.compare(foco, foco);
        }

        List<ResultadoAlgoritmo> resultados = new ArrayList<>();

        // 4. Executa a comparação com todos os algoritmos.
        for (Algoritmo algoritmo : Algoritmo.values()) {

            AlgoritmoOrdenacao alg = algoritmo.criar();

            // Aquecimento do algoritmo com até 500 registros.
            List<FocoIncendio> aquecimento = new ArrayList<>(
                    base.subList(0, Math.min(500, base.size()))
            );

            alg.ordenar(aquecimento, comparador, new Metricas());

            long[] tempos = new long[repeticoes];
            long comparacoes = 0;
            long trocas = 0;
            boolean ordenado = true;

            // Três execuções com cópias independentes da amostra.
            for (int i = 0; i < repeticoes; i++) {

                List<FocoIncendio> copia = new ArrayList<>(base);
                Metricas metricas = new Metricas();

                long inicio = System.nanoTime();

                alg.ordenar(copia, comparador, metricas);

                tempos[i] = System.nanoTime() - inicio;

                // Guarda as métricas da primeira execução.
                if (i == 0) {
                    comparacoes = metricas.getComparacoes();
                    trocas = metricas.getTrocas();
                }

                // Verifica se a lista ficou corretamente ordenada.
                for (int j = 1; j < copia.size(); j++) {
                    if (comparador.compare(copia.get(j - 1), copia.get(j)) > 0) {
                        ordenado = false;
                        break;
                    }
                }
            }

            // 5. Calcula a mediana dos tempos.
            Arrays.sort(tempos);
            long medianaNs = tempos[tempos.length / 2];

            resultados.add(new ResultadoAlgoritmo(
                    alg.nome(),
                    comparacoes,
                    trocas,
                    medianaNs,
                    medianaNs / 1_000_000.0,
                    ordenado,
                    repeticoes
            ));
        }

        return new ResultadoComparacao(
                criterio.name(),
                focos.size(),
                tamanhoAmostra,
                repeticoes,
                semente,
                resultados
        );
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

    /** Um foco no formato enviado ao navegador (data já como texto ISO, sem depender do Jackson). */
    public record FocoDto(String dataHora, String municipio, String bioma, double latitude, double longitude) {
        static FocoDto de(FocoIncendio f) {
            return new FocoDto(f.dataHora().format(FORMATO_DATA), f.municipio(), f.bioma(),
                    f.latitude(), f.longitude());
        }
    }


    public record ResultadoComparacao(
            String criterio,
            int totalBase,
            int tamanhoAmostra,
            int repeticoes,
            long sementeEmbaralhamento,
            List<ResultadoAlgoritmo> resultados
    ) {
    }

    public record ResultadoAlgoritmo(
            String algoritmo,
            long comparacoes,
            long trocas,
            long duracaoNsMediana,
            double duracaoMsMediana,
            boolean ordenado,
            int repeticoes
    ) {
    }
}
