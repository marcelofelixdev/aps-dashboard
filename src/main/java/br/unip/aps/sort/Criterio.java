package br.unip.aps.sort;

import br.unip.aps.model.FocoIncendio;

import java.text.CollationKey;
import java.text.Collator;
import java.util.Comparator;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Critérios de ordenação exigidos pela APS.
 *
 * <p>Em empate no critério principal, o desempate é pela data/hora.
 *
 * <p>Textos (bioma e município) são comparados em ordem alfabética do português, e não pela
 * tabela Unicode: com {@code String.compareTo}, "ÁGUAS DE LINDÓIA" iria para depois de "ZACARIAS",
 * porque o código do "Á" é maior que o do "Z". Para não pagar o custo do {@link Collator} em cada uma
 * das milhões de comparações do Bubble Sort, a chave de cada texto é calculada uma vez e guardada.
 */
public enum Criterio {

    DATA(Comparator.comparing(FocoIncendio::dataHora)),

    BIOMA(Comparator.comparing((FocoIncendio f) -> Textos.chave(f.bioma()))
            .thenComparing(FocoIncendio::dataHora)),

    MUNICIPIO(Comparator.comparing((FocoIncendio f) -> Textos.chave(f.municipio()))
            .thenComparing(FocoIncendio::dataHora));

    private final Comparator<FocoIncendio> comparador;

    Criterio(Comparator<FocoIncendio> comparador) {
        this.comparador = comparador;
    }

    public Comparator<FocoIncendio> comparador() {
        return comparador;
    }

    /** Chaves de ordenação alfabética em português, calculadas uma vez por texto. */
    private static final class Textos {
        private static final Collator COLLATOR = Collator.getInstance(Locale.of("pt", "BR"));
        private static final Map<String, CollationKey> CACHE = new ConcurrentHashMap<>();

        static {
            COLLATOR.setStrength(Collator.TERTIARY);
        }

        static CollationKey chave(String texto) {
            return CACHE.computeIfAbsent(texto, COLLATOR::getCollationKey);
        }
    }
}
