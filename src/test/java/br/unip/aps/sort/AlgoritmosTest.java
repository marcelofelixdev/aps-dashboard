package br.unip.aps.sort;

import br.unip.aps.io.LeitorCsv;
import br.unip.aps.model.FocoIncendio;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Random;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AlgoritmosTest {

    private static final List<AlgoritmoOrdenacao> TODOS = List.of(
            new BubbleSort(), new InsertionSort(), new SelectionSort(),
            new MergeSort(), new QuickSort(), new HeapSort());

    /** Estáveis: mantêm a ordem original dos empates → resultado idêntico ao List.sort do Java. */
    private static final List<Class<?>> ESTAVEIS = List.of(
            BubbleSort.class, InsertionSort.class, MergeSort.class);

    private static List<FocoIncendio> focosReais;

    @BeforeAll
    static void carregarDados() throws IOException {
        LeitorCsv leitor = new LeitorCsv();
        focosReais = new ArrayList<>(leitor.ler(Path.of("data", "focos_br_sp_ref_2023.csv")));
        focosReais.addAll(leitor.ler(Path.of("data", "focos_br_sp_ref_2024.csv")));
    }

    // ---------- um teste por algoritmo (como no guia do grupo) ----------

    @Test
    void bubbleSortOrdenaIgualAoJava() {
        verificaOrdenacao(new BubbleSort());
    }

    @Test
    void insertionSortOrdenaIgualAoJava() {
        verificaOrdenacao(new InsertionSort());
    }

    @Test
    void selectionSortOrdenaIgualAoJava() {
        verificaOrdenacao(new SelectionSort());
    }

    @Test
    void mergeSortOrdenaIgualAoJava() {
        verificaOrdenacao(new MergeSort());
    }

    @Test
    void quickSortOrdenaIgualAoJava() {
        verificaOrdenacao(new QuickSort());
    }

    @Test
    void heapSortOrdenaIgualAoJava() {
        verificaOrdenacao(new HeapSort());
    }

    /** Compara o resultado do algoritmo com o sort pronto do Java (usado só como gabarito). */
    private void verificaOrdenacao(AlgoritmoOrdenacao algoritmo) {
        List<Integer> numeros = new Random(42).ints(500, 0, 1000).boxed().toList();

        List<Integer> esperado = new ArrayList<>(numeros);
        esperado.sort(Comparator.naturalOrder());

        List<Integer> obtido = new ArrayList<>(numeros);
        Metricas metricas = new Metricas();
        algoritmo.ordenar(obtido, Comparator.naturalOrder(), metricas);

        assertEquals(esperado, obtido);
        assertTrue(metricas.getComparacoes() > 0, "nenhuma comparação foi contada");
    }

    // ---------- casos-limite, para todos os algoritmos ----------

    static Stream<AlgoritmoOrdenacao> algoritmos() {
        return TODOS.stream();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("algoritmos")
    void casosLimite(AlgoritmoOrdenacao algoritmo) {
        verificaInteiros(algoritmo, List.of());
        verificaInteiros(algoritmo, List.of(7));
        verificaInteiros(algoritmo, List.of(2, 1));
        verificaInteiros(algoritmo, Collections.nCopies(300, 5));                   // todos iguais
        verificaInteiros(algoritmo, sequencia(1000));                               // já ordenada
        verificaInteiros(algoritmo, sequencia(1000).reversed());                    // invertida
        verificaInteiros(algoritmo, new Random(7).ints(1000, 0, 3).boxed().toList()); // muitos repetidos
    }

    private void verificaInteiros(AlgoritmoOrdenacao algoritmo, List<Integer> entrada) {
        List<Integer> esperado = new ArrayList<>(entrada);
        esperado.sort(Comparator.naturalOrder());

        List<Integer> obtido = new ArrayList<>(entrada);
        algoritmo.ordenar(obtido, Comparator.naturalOrder(), new Metricas());

        assertEquals(esperado, obtido, algoritmo.nome() + " com entrada de tamanho " + entrada.size());
    }

    private static List<Integer> sequencia(int n) {
        List<Integer> l = new ArrayList<>();
        for (int i = 0; i < n; i++) l.add(i);
        return l;
    }

    @Test
    void lista_ja_ordenada_e_o_melhor_caso_do_insertion_e_do_bubble() {
        List<Integer> ordenada = sequencia(1000);
        for (AlgoritmoOrdenacao alg : List.of(new InsertionSort(), new BubbleSort())) {
            Metricas m = new Metricas();
            alg.ordenar(new ArrayList<>(ordenada), Comparator.naturalOrder(), m);
            assertEquals(999, m.getComparacoes(), alg.nome() + ": n-1 comparações");
            assertEquals(0, m.getTrocas(), alg.nome() + ": nenhuma troca");
        }
    }

    // ---------- dados reais do INPE, nos três critérios ----------

    static Stream<Arguments> algoritmosECriterios() {
        return TODOS.stream().flatMap(alg ->
                Stream.of(Criterio.values()).map(c -> Arguments.of(alg, c)));
    }

    /**
     * Usa uma amostra embaralhada de 2.000 focos reais (com a lista inteira, Bubble e Selection
     * deixariam a bateria de testes lenta).
     */
    @ParameterizedTest(name = "{0} por {1}")
    @MethodSource("algoritmosECriterios")
    void ordenaFocosReais(AlgoritmoOrdenacao algoritmo, Criterio criterio) {
        List<FocoIncendio> amostra = new ArrayList<>(focosReais);
        Collections.shuffle(amostra, new Random(2026));
        amostra = new ArrayList<>(amostra.subList(0, 2000));

        Comparator<FocoIncendio> cmp = criterio.comparador();
        List<FocoIncendio> esperado = new ArrayList<>(amostra);
        esperado.sort(cmp); // gabarito (o List.sort do Java é estável)

        List<FocoIncendio> obtido = new ArrayList<>(amostra);
        Metricas metricas = new Metricas();
        algoritmo.ordenar(obtido, cmp, metricas);

        if (ESTAVEIS.contains(algoritmo.getClass())) {
            assertEquals(esperado, obtido, "algoritmo estável deve dar exatamente o mesmo resultado");
        } else {
            // não estáveis: os empates podem sair em outra ordem, mas a lista tem que estar
            // ordenada e conter exatamente os mesmos focos
            for (int i = 1; i < obtido.size(); i++) {
                assertTrue(cmp.compare(obtido.get(i - 1), obtido.get(i)) <= 0,
                        "fora de ordem na posição " + i);
            }
            List<FocoIncendio> a = new ArrayList<>(esperado);
            List<FocoIncendio> b = new ArrayList<>(obtido);
            Comparator<FocoIncendio> porId = Comparator.comparingLong(FocoIncendio::idBdq);
            a.sort(porId);
            b.sort(porId);
            assertEquals(a, b, "a lista ordenada perdeu ou duplicou focos");
        }
        assertTrue(metricas.getComparacoes() > 0);
    }

    @Test
    void ordenarListaInteiraPorDataNaoEstouraAPilhaNoQuickSort() {
        // Os CSVs já vêm ordenados por data: é o pior caso de um Quick Sort com pivô fixo.
        List<FocoIncendio> todos = new ArrayList<>(focosReais);
        Metricas m = new Metricas();
        new QuickSort().ordenar(todos, Criterio.DATA.comparador(), m);
        for (int i = 1; i < todos.size(); i++) {
            assertTrue(Criterio.DATA.comparador().compare(todos.get(i - 1), todos.get(i)) <= 0);
        }
        // n log2 n ≈ 140 mil; o pior caso seria ≈ 54 milhões
        assertTrue(m.getComparacoes() < 1_000_000, "comparações demais: " + m.getComparacoes());
    }
}
