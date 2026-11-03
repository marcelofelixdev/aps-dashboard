package br.unip.aps.service;

import br.unip.aps.io.LeitorCsv;
import br.unip.aps.model.FocoIncendio;
import br.unip.aps.service.EstatisticaService.Contagem;
import br.unip.aps.service.EstatisticaService.Estatisticas;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EstatisticaServiceTest {

    private static FocoIncendio foco(String data, String municipio, String bioma) {
        return new FocoIncendio(0, "f", 0, 0, LocalDateTime.parse(data), municipio, bioma);
    }

    private final List<FocoIncendio> focos = List.of(
            foco("2023-09-01T10:00", "AVARÉ", "Cerrado"),
            foco("2023-09-15T10:00", "AVARÉ", "Cerrado"),
            foco("2024-01-10T10:00", "BAURU", "Cerrado"),
            foco("2024-09-02T10:00", "BAURU", "Mata Atlântica"),
            foco("2024-09-03T10:00", "AMERICANA", "Mata Atlântica"),
            foco("2024-09-04T10:00", "AVARÉ", "Mata Atlântica")
    );

    @Test
    void contagensGerais() {
        Estatisticas e = new EstatisticaService(focos).calcular(null, 10);

        assertEquals(6, e.totalFocos());
        assertEquals(3, e.municipiosDistintos());
        assertEquals(List.of(new Contagem("2023", 2), new Contagem("2024", 4)), e.porAno());
        assertEquals(List.of(new Contagem("Cerrado", 3), new Contagem("Mata Atlântica", 3)), e.porBioma());
    }

    @Test
    void rankingDeMunicipiosComDesempateAlfabetico() {
        Estatisticas e = new EstatisticaService(focos).calcular(null, 2);
        // AVARÉ 3; BAURU 2; AMERICANA 1 → top 2
        assertEquals(List.of(new Contagem("AVARÉ", 3), new Contagem("BAURU", 2)), e.topMunicipios());
    }

    @Test
    void porMesTemTodosOsMesesEmOrdemCronologica() {
        Estatisticas e = new EstatisticaService(focos).calcular(null, 10);

        assertEquals(24, e.porMes().size()); // jan/2023 .. dez/2024, inclusive meses sem focos
        assertEquals(new Contagem("jan/2023", 0), e.porMes().get(0));
        assertEquals(new Contagem("set/2023", 2), e.porMes().get(8));
        assertEquals(new Contagem("set/2024", 3), e.porMes().get(20));
        assertEquals(6, e.porMes().stream().mapToLong(Contagem::focos).sum());
    }

    @Test
    void filtroPorAno() {
        Estatisticas e = new EstatisticaService(focos).calcular(2023, 10);

        assertEquals(2023, e.ano());
        assertEquals(2, e.totalFocos());
        assertEquals(12, e.porMes().size());
        assertEquals(List.of(new Contagem("AVARÉ", 2)), e.topMunicipios());
    }

    @Test
    void dadosReaisSomamOTotal() throws IOException {
        LeitorCsv leitor = new LeitorCsv();
        List<FocoIncendio> reais = new ArrayList<>(leitor.ler(Path.of("data", "focos_br_sp_ref_2023.csv")));
        reais.addAll(leitor.ler(Path.of("data", "focos_br_sp_ref_2024.csv")));

        Estatisticas e = new EstatisticaService(reais).calcular(null, 10);

        assertEquals(10378, e.totalFocos());
        assertEquals(10378, e.porBioma().stream().mapToLong(Contagem::focos).sum());
        assertEquals(10378, e.porMes().stream().mapToLong(Contagem::focos).sum());
        assertEquals(10, e.topMunicipios().size());
        for (int i = 1; i < e.topMunicipios().size(); i++) {
            assertTrue(e.topMunicipios().get(i - 1).focos() >= e.topMunicipios().get(i).focos());
        }
    }
}
