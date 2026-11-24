#!/usr/bin/env python3
"""
Atualiza o número de versão (?v=...) dos arquivos CSS e JS em todas as páginas.

O código é calculado a partir do conteúdo de cada arquivo. Assim, sempre que um
CSS ou JS muda, o endereço muda junto e o navegador baixa a versão nova, em vez
de usar a antiga guardada em cache.

Uso (na pasta do projeto):  python3 ferramentas/atualizar_versao.py
Rode sempre antes de fazer o commit de mudanças em CSS ou JS.
"""
import hashlib
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parent.parent
PADRAO = re.compile(r'((?:src|href)=")(\./assets/(?:js|style)/[^"?]+\.(?:js|css))(?:\?v=[^"]*)?(")')


def versao(caminho: str) -> str:
    arquivo = RAIZ / caminho.lstrip("./")
    return hashlib.sha256(arquivo.read_bytes()).hexdigest()[:10]


def main() -> None:
    alteradas = 0
    for pagina in sorted(RAIZ.glob("*.html")):
        texto = pagina.read_text(encoding="utf-8")
        novo = PADRAO.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={versao(m.group(2))}{m.group(3)}", texto)
        if novo != texto:
            pagina.write_text(novo, encoding="utf-8")
            alteradas += 1
            print(f"atualizada: {pagina.name}")
    print(f"{alteradas} página(s) atualizada(s).")


if __name__ == "__main__":
    main()
