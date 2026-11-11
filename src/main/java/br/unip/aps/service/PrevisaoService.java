package br.unip.aps.service;

import br.unip.aps.model.FocoIncendio;
import br.unip.aps.sort.MergeSort;
import br.unip.aps.sort.Metricas;

import java.text.Collator;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Página "Previsões e prevenção": perfil sazonal, cenários para o próximo ano, ranking de prioridade
 * dos municípios e das áreas de recorrência, e uma validação retroativa (priorizar com os dados de
 * 2023 e ver quanto dos focos de 2024 teria sido coberto).
 *
 * Não é um modelo de machine learning: são contas simples sobre os registros, que o grupo consegue
 * explicar linha por linha. Os rankings são ordenados com o nosso {@link MergeSort}.
 */
public class PrevisaoService {

    static final String[] MESES = {
            "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"};

    /** Tamanho da célula da grade, em graus (0,1° ≈ 11 km). */
    static final double CELULA = 0.1;

    /** Fatias do ranking: os 5% primeiros são prioridade alta, os 15% seguintes, média. */
    static final double FATIA_ALTA = 0.05;
    static final double FATIA_MEDIA = 0.20;

    /** Pesos do índice de prioridade (somam 1). */
    static final double PESO_FOCOS = 0.5;
    static final double PESO_DIAS = 0.3;
    static final double PESO_RECORRENCIA = 0.2;

    /** A janela crítica é o menor intervalo de meses seguidos com pelo menos esta fração dos focos. */
    static final double FRACAO_JANELA = 0.75;

    private static final Collator COLLATOR = Collator.getInstance(Locale.of("pt", "BR"));

    private final List<FocoIncendio> focos;
    private final List<Integer> anos;

    public PrevisaoService(List<FocoIncendio> focos) {
        this.focos = List.copyOf(focos);
        Set<Integer> conjunto = new HashSet<>();
        for (FocoIncendio f : focos) {
            conjunto.add(f.dataHora().getYear());
        }
        List<Integer> lista = new ArrayList<>(conjunto);
        new MergeSort().ordenar(lista, Comparator.naturalOrder(), new Metricas());
        this.anos = List.copyOf(lista);
    }

    /** @param topN quantos municípios devolver no ranking detalhado */
    public Previsoes calcular(int topN) {
        Metricas metricas = new Metricas();
        List<Mes> sazonalidade = sazonalidade();
        Janela janela = janelaCritica(sazonalidade);
        List<Area> municipios = rankingMunicipios(focos, metricas);
        List<Area> areas = rankingCelulas(metricas);

        int alta = 0;
        int media = 0;
        long focosAlta = 0;
        for (Area a : municipios) {
            if (a.prioridade().equals("alta")) {
                alta++;
                focosAlta += a.total();
            } else if (a.prioridade().equals("media")) {
                media++;
            }
        }
        Resumo resumo = new Resumo(municipios.size(), alta, media, municipios.size() - alta - media,
                focosAlta, focos.size());

        // células: só as que tiveram foco em todos os anos, até 60, para o mapa
        List<Area> areasRecorrentes = new ArrayList<>();
        for (Area a : areas) {
            if (a.recorrente() && areasRecorrentes.size() < 60) {
                areasRecorrentes.add(a);
            }
        }

        return new Previsoes(
                anos,
                sazonalidade,
                janela,
                resumo,
                new ArrayList<>(municipios.subList(0, Math.min(topN, municipios.size()))),
                municipios,
                areasRecorrentes,
                validacao(),
                new Ordenacao("Merge Sort", metricas.getComparacoes(), metricas.getTrocas()));
    }

    // ------------------------------------------------------------------------------------------
    // Quando: perfil sazonal e cenários
    // ------------------------------------------------------------------------------------------

    /**
     * Para cada mês: focos de cada ano, a participação média do mês no total anual (média das
     * participações de cada ano, para o ano maior não dominar o perfil) e três cenários para um
     * próximo ano: total igual ao menor ano, à média e ao maior ano, distribuído pelo perfil.
     */
    List<Mes> sazonalidade() {
        Map<Integer, long[]> porAno = new LinkedHashMap<>();
        for (int a : anos) {
            porAno.put(a, new long[12]);
        }
        for (FocoIncendio f : focos) {
            porAno.get(f.dataHora().getYear())[f.dataHora().getMonthValue() - 1]++;
        }

        long menor = Long.MAX_VALUE;
        long maior = 0;
        long soma = 0;
        double[] participacao = new double[12];
        for (long[] meses : porAno.values()) {
            long total = 0;
            for (long m : meses) {
                total += m;
            }
            menor = Math.min(menor, total);
            maior = Math.max(maior, total);
            soma += total;
            for (int m = 0; m < 12; m++) {
                participacao[m] += total == 0 ? 0 : (double) meses[m] / total / porAno.size();
            }
        }
        double mediaAnual = porAno.isEmpty() ? 0 : (double) soma / porAno.size();

        List<Mes> lista = new ArrayList<>();
        for (int m = 0; m < 12; m++) {
            List<Long> doMes = new ArrayList<>();
            for (long[] meses : porAno.values()) {
                doMes.add(meses[m]);
            }
            lista.add(new Mes(MESES[m], doMes, arredondar(participacao[m] * 100, 1),
                    Math.round(participacao[m] * menor),
                    Math.round(participacao[m] * mediaAnual),
                    Math.round(participacao[m] * maior)));
        }
        return lista;
    }

    /** Menor sequência de meses seguidos (dentro do ano) que soma pelo menos {@link #FRACAO_JANELA}. */
    static Janela janelaCritica(List<Mes> meses) {
        int melhorInicio = 0;
        int melhorFim = 11;
        for (int inicio = 0; inicio < 12; inicio++) {
            double soma = 0;
            for (int fim = inicio; fim < 12; fim++) {
                soma += meses.get(fim).participacao();
                if (soma >= FRACAO_JANELA * 100 - 1e-9) {
                    if (fim - inicio < melhorFim - melhorInicio) {
                        melhorInicio = inicio;
                        melhorFim = fim;
                    }
                    break;
                }
            }
        }
        double soma = 0;
        for (int m = melhorInicio; m <= melhorFim; m++) {
            soma += meses.get(m).participacao();
        }
        return new Janela(MESES[melhorInicio], MESES[melhorFim], melhorInicio + 1, melhorFim + 1,
                arredondar(soma, 1));
    }

    // ------------------------------------------------------------------------------------------
    // Onde: índice de prioridade por município e por célula da grade
    // ------------------------------------------------------------------------------------------

    /** Todos os municípios com foco, do maior índice para o menor, já com a faixa de prioridade. */
    List<Area> rankingMunicipios(List<FocoIncendio> lista, Metricas metricas) {
        Map<String, Acumulador> mapa = new LinkedHashMap<>();
        for (FocoIncendio f : lista) {
            mapa.computeIfAbsent(f.municipio(), Acumulador::new).somar(f);
        }
        return ranquear(mapa, metricas);
    }

    /** Células de 0,1° × 0,1°, rotuladas pelo município que mais aparece nelas. */
    List<Area> rankingCelulas(Metricas metricas) {
        Map<String, Acumulador> mapa = new LinkedHashMap<>();
        for (FocoIncendio f : focos) {
            long linha = (long) Math.floor(f.latitude() / CELULA);
            long coluna = (long) Math.floor(f.longitude() / CELULA);
            mapa.computeIfAbsent(linha + ":" + coluna, Acumulador::new).somar(f);
        }
        return ranquear(mapa, metricas);
    }

    private List<Area> ranquear(Map<String, Acumulador> mapa, Metricas metricas) {
        long maxFocos = 1;
        long maxDias = 1;
        for (Acumulador a : mapa.values()) {
            maxFocos = Math.max(maxFocos, a.total);
            maxDias = Math.max(maxDias, a.dias.size());
        }

        List<Acumulador> lista = new ArrayList<>(mapa.values());
        for (Acumulador a : lista) {
            boolean recorrente = a.porAno.size() == anos.size() && anos.size() > 1;
            a.indice = 100 * (PESO_FOCOS * a.total / maxFocos
                    + PESO_DIAS * a.dias.size() / maxDias
                    + PESO_RECORRENCIA * (recorrente ? 1 : 0));
        }
        // maior índice primeiro; empate: mais focos, depois nome
        Comparator<Acumulador> ordem = Comparator.comparingDouble((Acumulador a) -> a.indice).reversed()
                .thenComparing(Comparator.comparingLong((Acumulador a) -> a.total).reversed())
                .thenComparing((Acumulador a) -> a.rotulo(), COLLATOR);
        new MergeSort().ordenar(lista, ordem, metricas);

        int n = lista.size();
        int limiteAlta = Math.max(1, (int) Math.ceil(n * FATIA_ALTA));
        int limiteMedia = Math.max(limiteAlta, (int) Math.ceil(n * FATIA_MEDIA));
        List<Area> resultado = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            String prioridade = i < limiteAlta ? "alta" : i < limiteMedia ? "media" : "baixa";
            resultado.add(lista.get(i).paraArea(i + 1, prioridade, anos));
        }
        return resultado;
    }

    // ------------------------------------------------------------------------------------------
    // Validação retroativa: prioriza com o primeiro ano e mede no último
    // ------------------------------------------------------------------------------------------

    Validacao validacao() {
        if (anos.size() < 2) {
            return null;
        }
        int anoBase = anos.get(0);
        int anoTeste = anos.get(anos.size() - 1);

        List<FocoIncendio> base = new ArrayList<>();
        Map<String, Long> teste = new HashMap<>();
        long totalTeste = 0;
        Set<String> todosMunicipios = new HashSet<>();
        for (FocoIncendio f : focos) {
            todosMunicipios.add(f.municipio());
            if (f.dataHora().getYear() == anoBase) {
                base.add(f);
            } else if (f.dataHora().getYear() == anoTeste) {
                teste.merge(f.municipio(), 1L, Long::sum);
                totalTeste++;
            }
        }

        List<Area> rankingBase = rankingMunicipios(base, new Metricas());
        Set<String> comFocoNaBase = new HashSet<>();
        for (Area a : rankingBase) {
            comFocoNaBase.add(a.nome());
        }
        long focosTesteEmMunicipiosDaBase = 0;
        for (Map.Entry<String, Long> e : teste.entrySet()) {
            if (comFocoNaBase.contains(e.getKey())) {
                focosTesteEmMunicipiosDaBase += e.getValue();
            }
        }

        // "ideal": os K municípios com mais focos no próprio ano de teste (ninguém sabe isso antes)
        List<Long> testeOrdenado = new ArrayList<>(teste.values());
        new MergeSort().ordenar(testeOrdenado, Comparator.<Long>reverseOrder(), new Metricas());

        List<Cobertura> coberturas = new ArrayList<>();
        int totalMunicipios = todosMunicipios.size();
        for (int k : new int[]{10, 30, 58, 116}) {
            long pelaBase = 0;
            for (int i = 0; i < Math.min(k, rankingBase.size()); i++) {
                pelaBase += teste.getOrDefault(rankingBase.get(i).nome(), 0L);
            }
            long ideal = 0;
            for (int i = 0; i < Math.min(k, testeOrdenado.size()); i++) {
                ideal += testeOrdenado.get(i);
            }
            double aleatorio = (double) k / totalMunicipios * totalTeste;
            coberturas.add(new Cobertura(k,
                    arredondar(100.0 * k / totalMunicipios, 1),
                    pelaBase, arredondar(100.0 * pelaBase / totalTeste, 1),
                    arredondar(100.0 * aleatorio / totalTeste, 1),
                    arredondar(100.0 * ideal / totalTeste, 1)));
        }

        return new Validacao(anoBase, anoTeste, totalTeste, comFocoNaBase.size(),
                focosTesteEmMunicipiosDaBase,
                arredondar(100.0 * focosTesteEmMunicipiosDaBase / totalTeste, 1),
                coberturas);
    }

    private static double arredondar(double valor, int casas) {
        double fator = Math.pow(10, casas);
        return Math.round(valor * fator) / fator;
    }

    // ------------------------------------------------------------------------------------------

    /** Junta os focos de um município ou de uma célula. */
    private static final class Acumulador {
        final String chave;
        long total;
        final Map<Integer, Long> porAno = new HashMap<>();
        final Set<LocalDate> dias = new HashSet<>();
        final long[] porMes = new long[12];
        final Map<String, Long> biomas = new HashMap<>();
        final Map<String, Long> municipios = new HashMap<>();
        double somaLat;
        double somaLon;
        double indice;

        Acumulador(String chave) {
            this.chave = chave;
        }

        void somar(FocoIncendio f) {
            total++;
            porAno.merge(f.dataHora().getYear(), 1L, Long::sum);
            dias.add(f.dataHora().toLocalDate());
            porMes[f.dataHora().getMonthValue() - 1]++;
            biomas.merge(f.bioma(), 1L, Long::sum);
            municipios.merge(f.municipio(), 1L, Long::sum);
            somaLat += f.latitude();
            somaLon += f.longitude();
        }

        /** Município, ou o município predominante quando o acumulador é uma célula. */
        String rotulo() {
            return maisFrequente(municipios);
        }

        Area paraArea(int posicao, String prioridade, List<Integer> anos) {
            int mesPico = 0;
            for (int m = 1; m < 12; m++) {
                if (porMes[m] > porMes[mesPico]) {
                    mesPico = m;
                }
            }
            List<Long> focosPorAno = new ArrayList<>();
            for (int a : anos) {
                focosPorAno.add(porAno.getOrDefault(a, 0L));
            }
            List<String> mesesAtivos = new ArrayList<>();
            for (int m = 0; m < 12; m++) {
                if (porMes[m] > 0) {
                    mesesAtivos.add(MESES[m]);
                }
            }
            boolean recorrente = porAno.size() == anos.size() && anos.size() > 1;
            return new Area(posicao, rotulo(), focosPorAno, total, dias.size(), mesesAtivos.size(),
                    MESES[mesPico], maisFrequente(biomas), recorrente,
                    arredondar(indice, 1), prioridade,
                    arredondar(somaLat / total, 4), arredondar(somaLon / total, 4));
        }

        private static String maisFrequente(Map<String, Long> mapa) {
            String melhor = null;
            long qtd = -1;
            for (Map.Entry<String, Long> e : mapa.entrySet()) {
                if (e.getValue() > qtd || (e.getValue() == qtd && COLLATOR.compare(e.getKey(), melhor) < 0)) {
                    melhor = e.getKey();
                    qtd = e.getValue();
                }
            }
            return melhor;
        }
    }

    // ------------------------------------------------------------------------------------------
    // Resposta de GET /api/previsoes
    // ------------------------------------------------------------------------------------------

    public record Previsoes(
            List<Integer> anos,
            List<Mes> sazonalidade,
            Janela janelaCritica,
            Resumo resumo,
            List<Area> municipios,
            List<Area> todosMunicipios,
            List<Area> areasRecorrentes,
            Validacao validacao,
            Ordenacao ordenacao
    ) {
    }

    /** Um mês do perfil sazonal: focos de cada ano (na ordem de {@code anos}) e cenários. */
    public record Mes(String mes, List<Long> focosPorAno, double participacao,
                      long cenarioBaixo, long cenarioCentral, long cenarioAlto) {
    }

    public record Janela(String inicio, String fim, int mesInicio, int mesFim, double participacao) {
    }

    public record Resumo(int municipios, int alta, int media, int baixa, long focosAlta, long focosTotal) {
    }

    /** Um município (ou célula da grade) com seu índice e faixa de prioridade. */
    public record Area(int posicao, String nome, List<Long> focosPorAno, long total, int diasComFoco,
                       int mesesAtivos, String mesPico, String bioma, boolean recorrente,
                       double indice, String prioridade, double latitude, double longitude) {
    }

    public record Validacao(int anoBase, int anoTeste, long focosTeste, int municipiosBase,
                            long focosTesteEmMunicipiosDaBase, double percentualEmMunicipiosDaBase,
                            List<Cobertura> coberturas) {
    }

    /**
     * Se a prioridade tivesse sido dada aos {@code k} primeiros do ranking do ano-base, quanto dos
     * focos do ano de teste estaria neles; comparado com sorteio e com o ideal (saber o futuro).
     */
    public record Cobertura(int k, double percentualMunicipios, long focos, double percentual,
                            double aleatorio, double ideal) {
    }

    public record Ordenacao(String algoritmo, long comparacoes, long trocas) {
    }
}
