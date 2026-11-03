package br.unip.aps.sort;

import br.unip.aps.model.FocoIncendio;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CriterioTest {

    private static FocoIncendio foco(long id, String data, String municipio, String bioma) {
        return new FocoIncendio(id, "f" + id, 0, 0, LocalDateTime.parse(data), municipio, bioma);
    }

    private static List<Long> idsOrdenados(List<FocoIncendio> focos, Criterio criterio) {
        List<FocoIncendio> copia = new ArrayList<>(focos);
        new MergeSort().ordenar(copia, criterio.comparador(), new Metricas());
        return copia.stream().map(FocoIncendio::idBdq).toList();
    }

    private final List<FocoIncendio> focos = List.of(
            foco(1, "2024-03-10T14:00", "ZACARIAS", "Cerrado"),
            foco(2, "2023-08-01T10:00", "ÁGUAS DE LINDÓIA", "Mata Atlântica"),
            foco(3, "2024-01-05T09:00", "AVARÉ", "Cerrado"),
            foco(4, "2023-02-20T16:30", "AVARÉ", "Mata Atlântica"),
            foco(5, "2023-02-20T16:00", "ZACARIAS", "Cerrado")
    );

    @Test
    void data() {
        assertEquals(List.of(5L, 4L, 2L, 3L, 1L), idsOrdenados(focos, Criterio.DATA));
    }

    @Test
    void biomaDesempataPorData() {
        // Cerrado: 5 (fev/23), 3 (jan/24), 1 (mar/24) | Mata Atlântica: 4 (fev/23), 2 (ago/23)
        assertEquals(List.of(5L, 3L, 1L, 4L, 2L), idsOrdenados(focos, Criterio.BIOMA));
    }

    @Test
    void municipioEmOrdemAlfabeticaDoPortuguesEDesempataPorData() {
        // "ÁGUAS..." vem antes de "AVARÉ" (o acento não joga o nome para o fim da lista)
        assertEquals(List.of(2L, 4L, 3L, 5L, 1L), idsOrdenados(focos, Criterio.MUNICIPIO));
    }
}
