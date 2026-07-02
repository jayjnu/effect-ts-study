export const domainPuritySelectors = [
  {
    selector: "ImportDeclaration[source.value='effect'] ImportSpecifier[imported.name=/^(Context|Layer)$/]",
    message: "domain must stay pure: do not import Context or Layer."
  }
]
