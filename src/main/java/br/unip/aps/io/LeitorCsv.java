package br.unip.aps.io;

import br.unip.aps.model.FocoIncendio;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

/**
 * Lê os arquivos CSV do INPE e transforma cada linha em um {@link FocoIncendio}.
 */
public class LeitorCsv {

    public List<FocoIncendio> ler(Path arquivo) throws IOException {
        // TODO: implementar
        //  - ler com UTF-8 (Files.readAllLines)
        //  - pular o cabeçalho
        //  - split(",") e trim() em cada campo (id, lat e lon vêm com espaços!)
        //  - data no formato "yyyy-MM-dd HH:mm:ss"
        //  - decidir o que fazer com linha quebrada
        throw new UnsupportedOperationException("LeitorCsv ainda não implementado");
    }
}
