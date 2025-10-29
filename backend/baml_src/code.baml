class ViewElement {
  tag "view"
  children Element[]
  css string?
}

class TextElement {
  tag "text"
  text string
  css string?
}

type Element = TextElement | ViewElement

class Wireframe {
  elements Element[]
}

class Wireframes{
  wireframes Wireframe[] @check(more_than_3,
	  {{ this|length > 3 }}
  )
}

function GenerateWireframes(resume: string) -> Wireframes {
  client MercuryCoder
  prompt #"
    Gere alguns esboços baseados na seguinte descrição
    {{ resume }}

    Faça os esboços simples, eles serão refinados posteriormente. O objetivo é dar o usuário a capacidade de construir a interface do jeito que ele acha melhor.

    Não inclua nenhuma informação extra, apenas os wireframes em si. De preferência, gere pelo menos 3 variações diferentes, não existe quantidade máxima.

    Siga o seguinte formato
    {{ ctx.output_format }}
  "#
}

// Test the function with a sample resume. Open the VSCode playground to run this.
test teste {
  functions [GenerateWireframes]
  args {
    resume #"
      Gere uma dashboard web para um sistema de monitoramento de servidores.
    "#
  }
}
